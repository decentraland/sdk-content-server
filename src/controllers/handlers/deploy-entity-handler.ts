import { AuthChain, AuthLink, Entity } from '@dcl/schemas'
import { IHttpServerComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { FormDataContext } from '../../logic/multipart'
import { AppComponents, HandlerContextWithPath } from '../../types'
import { bufferToStream, streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'
import { stringToUtf8Bytes } from 'eth-connect'
import { SNS } from 'aws-sdk'
import { DeploymentToSqs } from '@dcl/schemas/dist/misc/deployments-to-sqs'

export function requireString(val: string | null | undefined): string {
  if (typeof val !== 'string') throw new Error('A string was expected')
  return val
}

export function extractAuthChain(ctx: FormDataContext): AuthChain {
  const ret: AuthChain = []

  let biggestIndex = -1

  // find the biggest index
  for (const i in ctx.formData.fields) {
    const regexResult = /authChain\[(\d+)]/.exec(i)
    if (regexResult) {
      biggestIndex = Math.max(biggestIndex, +regexResult[1])
    }
  }

  if (biggestIndex === -1) throw new Error('Missing auth chain')
  // fill all the authchain
  for (let i = 0; i <= biggestIndex; i++) {
    ret.push({
      payload: requireString(ctx.formData.fields[`authChain[${i}][payload]`].value),
      signature: requireString(ctx.formData.fields[`authChain[${i}][signature]`].value),
      type: requireString(ctx.formData.fields[`authChain[${i}][type]`].value) as any
    })
  }

  return ret
}

async function storeEntity(
  { storage }: Pick<AppComponents, 'storage'>,
  entity: Entity,
  allContentHashesInStorage: Map<string, boolean>,
  logger: ILoggerComponent.ILogger,
  files: Map<string, Uint8Array>,
  entityJson: string,
  authChain: AuthLink[],
  worldName: string
) {
  // store all files
  for (const file of entity.content!) {
    if (!allContentHashesInStorage.get(file.hash)) {
      const filename = entity.content!.find(($) => $.hash === file.hash)
      logger.info(`Storing file`, { cid: file.hash, filename: filename?.file || 'unknown' })
      await storage.storeStream(file.hash, bufferToStream(files.get(file.hash)!))
      allContentHashesInStorage.set(file.hash, true)
    }
  }

  // TODO Read already existing entity (if any) and remove all its files (to avoid leaving orphaned files)

  logger.info(`Storing entity`, { cid: entity.id })
  await storage.storeStream(entity.id, bufferToStream(stringToUtf8Bytes(entityJson)))
  await storage.storeStream(entity.id + '.auth', bufferToStream(stringToUtf8Bytes(JSON.stringify(authChain))))

  let acl
  const content = await storage.retrieve(`name-${worldName.toLowerCase()}`)
  if (content) {
    const stored = JSON.parse((await streamToBuffer(await content.asStream())).toString())
    acl = stored.acl
  }
  await storage.storeStream(
    `name-${worldName.toLowerCase()}`,
    bufferToStream(stringToUtf8Bytes(JSON.stringify({ entityId: entity.id, acl })))
  )
}

export async function deployEntity(
  ctx: FormDataContext &
    HandlerContextWithPath<
      'config' | 'ethereumProvider' | 'logs' | 'namePermissionChecker' | 'metrics' | 'storage' | 'sns' | 'validator',
      '/entities'
    >
): Promise<IHttpServerComponent.IResponse> {
  const logger = ctx.components.logs.getLogger('deploy')

  const Error400 = (message: string) => {
    logger.warn(message)
    return {
      status: 400,
      body: message
    }
  }

  try {
    const entityId = requireString(ctx.formData.fields.entityId.value)
    const authChain = extractAuthChain(ctx)

    const entityRaw = ctx.formData.files[entityId].value.toString()
    const sceneJson = JSON.parse(entityRaw)

    const entity: Entity = {
      id: entityId, // this is not part of the published entity
      timestamp: Date.now(), // this is not part of the published entity
      ...sceneJson
    }

    const uploadedFiles: Map<string, Uint8Array> = new Map()
    for (const filesKey in ctx.formData.files) {
      uploadedFiles.set(filesKey, ctx.formData.files[filesKey].value)
    }

    const contentHashesInStorage = await ctx.components.storage.existMultiple(
      Array.from(new Set(entity.content!.map(($) => $.hash)))
    )

    // run all validations about the deployment
    const validationResult = await ctx.components.validator.validate({
      entity,
      files: uploadedFiles,
      authChain,
      contentHashesInStorage
    })
    if (!validationResult.ok()) {
      return Error400(`Deployment failed: ${validationResult.errors.join(', ')}`)
    }

    // determine the name to use for deploying the world
    const worldName = sceneJson.metadata.worldConfiguration.name
    logger.debug(`Deployment for scene "${entityId}" under world name "${worldName}"`)

    // Store the entity
    await storeEntity(
      ctx.components,
      entity,
      contentHashesInStorage,
      logger,
      uploadedFiles,
      entityRaw,
      authChain,
      worldName
    )

    const baseUrl = (await ctx.components.config.getString('HTTP_BASE_URL')) || `https://${ctx.url.host}`

    ctx.components.metrics.increment('world_deployments_counter')

    // send deployment notification over sns
    if (ctx.components.sns.arn) {
      const deploymentToSqs: DeploymentToSqs = {
        entity: {
          entityId: entityId,
          authChain
        },
        contentServerUrls: [baseUrl]
      }
      const sns = new SNS()
      const receipt = await sns
        .publish({
          TopicArn: ctx.components.sns.arn,
          Message: JSON.stringify(deploymentToSqs)
        })
        .promise()
      logger.info('notification sent', {
        MessageId: receipt.MessageId as any,
        SequenceNumber: receipt.SequenceNumber as any
      })
    }

    const worldUrl = `${baseUrl}/world/${worldName}`

    return {
      status: 200,
      body: {
        creationTimestamp: Date.now(),
        message: [
          `Your scene was deployed to a Worlds Content Server!`,
          `Access world ${worldName}: https://play.decentraland.org/?realm=${encodeURIComponent(worldUrl)}`
        ].join('\n')
      }
    }
  } catch (err: any) {
    logger.error(err)
    throw err
  }
}
