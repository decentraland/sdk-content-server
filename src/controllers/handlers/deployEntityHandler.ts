import { AuthChain, AuthLink, Entity } from '@dcl/schemas'
import { IHttpServerComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { FormDataContext } from '../../logic/multipart'
import { AppComponents, HandlerContextWithPath } from '../../types'
import { bufferToStream } from '@dcl/catalyst-storage/dist/content-item'
import { stringToUtf8Bytes } from 'eth-connect'
import { SNS } from 'aws-sdk'
import { DeploymentToSqs } from '@dcl/schemas/dist/misc/deployments-to-sqs'

export function requireString(val: string): string {
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

  if (biggestIndex == -1) throw new Error('Missing auth chain')
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
  deploymentDclName: string
) {
  // store all files
  for (const file of entity.content!) {
    if (!allContentHashesInStorage.get(file.hash)) {
      const filename = entity.content!.find(($) => $.hash == file.hash)
      logger.info(`Storing file`, { cid: file.hash, filename: filename?.file || 'unknown' })
      await storage.storeStream(file.hash, bufferToStream(files.get(file.hash)!))
      allContentHashesInStorage.set(file.hash, true)
    }
  }

  // TODO Read already existing entity (if any) and remove all its files (to avoid leaving orphaned files)

  logger.info(`Storing entity`, { cid: entity.id })
  await storage.storeStream(entity.id, bufferToStream(stringToUtf8Bytes(entityJson)))
  await storage.storeStream(entity.id + '.auth', bufferToStream(stringToUtf8Bytes(JSON.stringify(authChain))))
  await storage.storeStream(
    `name-${deploymentDclName.toLowerCase()}.dcl.eth`,
    bufferToStream(stringToUtf8Bytes(JSON.stringify({ entityId: entity.id })))
  )
}

export async function deployEntity(
  ctx: FormDataContext &
    HandlerContextWithPath<
      'config' | 'ethereumProvider' | 'logs' | 'dclNameChecker' | 'metrics' | 'storage' | 'sns' | 'validator',
      '/entities'
    >
): Promise<IHttpServerComponent.IResponse> {
  const logger = ctx.components.logs.getLogger('deploy')
  const sns = new SNS()

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
    const signer = authChain[0].payload

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
    const names = await ctx.components.dclNameChecker.fetchNamesOwnedByAddress(signer)
    const deploymentDclName = ctx.components.dclNameChecker.determineDclNameToUse(names, sceneJson)
    logger.debug(`Deployment for scene "${entityId}" under dcl name "${deploymentDclName}.dcl.eth"`)

    // Store the entity
    await storeEntity(
      ctx.components,
      entity,
      contentHashesInStorage,
      logger,
      uploadedFiles,
      entityRaw,
      authChain,
      deploymentDclName
    )

    const baseUrl = ((await ctx.components.config.getString('HTTP_BASE_URL')) || `https://${ctx.url.host}`).toString()

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

    const worldUrl = `${baseUrl}/world/${deploymentDclName}.dcl.eth`
    const urn = `urn:decentraland:entity:${entityId}?baseUrl=${baseUrl}/ipfs`

    return {
      status: 200,
      body: {
        creationTimestamp: Date.now(),
        message: [
          `Your entity was deployed to a custom content server!`,
          `The URN for your entity is:\n  ${urn}`,
          ``,
          `You can preview it as a portable experience using this link: https://play.decentraland.org/?GLOBAL_PX=${encodeURIComponent(
            urn
          )}`,
          ``,
          `Preview as Space: https://play.decentraland.zone/?SPACE=${encodeURIComponent(urn)}`,
          `Preview as World: https://play.decentraland.zone/?realm=${encodeURIComponent(worldUrl)}`
        ].join('\n')
      }
    }
  } catch (err: any) {
    logger.error(err)
    throw err
  }
}
