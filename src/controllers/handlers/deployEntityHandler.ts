import { AuthChain, Entity, EthAddress, IPFSv2 } from "@dcl/schemas"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { FormDataContext } from "../../logic/multipart"
import { HandlerContextWithPath } from "../../types"
import { Authenticator } from "@dcl/crypto"
import { hashV1 } from "@dcl/hashing"
import { bufferToStream } from "@dcl/catalyst-storage/dist/content-item"
import { stringToUtf8Bytes } from "eth-connect"
import { fetchNamesOwnedByAddress } from "../../logic/check-permissions";
import { SNS } from "aws-sdk"
import { DeploymentToSqs } from "@dcl/schemas/dist/misc/deployments-to-sqs";
import { buildUrl } from "../../logic/url-generation";

 export function requireString(val: string): string {
  if (typeof val !== "string") throw new Error("A string was expected")
  return val
}

function Error400(message: string) {
  return {
    status: 400,
    body: message,
  }
}

export function extractAuthChain(ctx: FormDataContext): AuthChain {
  const ret: AuthChain = []

  let biggestIndex = -1

  // find the biggest index
  for (let i in ctx.formData.fields) {
    const regexResult = /authChain\[(\d+)\]/.exec(i)
    if (regexResult) {
      biggestIndex = Math.max(biggestIndex, +regexResult[1])
    }
  }

  if (biggestIndex == -1) throw new Error("Missing auth chain")
  // fill all the authchain
  for (let i = 0; i <= biggestIndex; i++) {
    ret.push({
      payload: requireString(ctx.formData.fields[`authChain[${i}][payload]`].value),
      signature: requireString(ctx.formData.fields[`authChain[${i}][signature]`].value),
      type: requireString(ctx.formData.fields[`authChain[${i}][type]`].value) as any,
    })
  }

  return ret
}

export async function deployEntity(
  ctx: FormDataContext & HandlerContextWithPath<"config" | "ethereumProvider" | "storage" | "logs" | "marketplaceSubGraph" | "sns", "/entities">
): Promise<IHttpServerComponent.IResponse> {
  const logger = ctx.components.logs.getLogger("deploy")
  const sns = new SNS()

  try {
    const entityId = requireString(ctx.formData.fields.entityId.value)
    const authChain = extractAuthChain(ctx)

    if (!AuthChain.validate(authChain)) {
      console.dir(authChain)
      console.dir(AuthChain.validate.errors)
      return Error400("Deployment failed: Invalid auth chain ")
    }

    const signer = authChain[0].payload

    if (!EthAddress.validate(signer)) {
      return Error400("Deployment failed: Invalid auth chain ")
    }

    // first validate auth chain
    const validAuthChain = await Authenticator.validateSignature(signer, authChain, ctx.components.ethereumProvider, 10)

    if (validAuthChain.ok) {
      return Error400("Deployment failed: Invalid auth chain " + validAuthChain.message)
    }

    // validate that the signer has permissions to deploy this scene
    const names = await fetchNamesOwnedByAddress(ctx.components, signer)
    const hasPermission = names.length > 0
    if (!hasPermission) {
      return Error400(`Deployment failed: Your wallet has no permission to publish to this server because it doesn't own a Decentraland NAME.`)
    }

    // then validate that the entityId is valid
    const entityRaw = ctx.formData.files[entityId].value.toString()
    if ((await hashV1(stringToUtf8Bytes(entityRaw))) != entityId) {
      return Error400("Deployment failed: Invalid entity hash")
    }
    // then validate that the entity is valid
    const entity: Partial<Entity> = JSON.parse(entityRaw)
    if (
      !Entity.validate({
        id: entityId, // this is not part of the published entity
        timestamp: Date.now(), // this is not part of the published entity
        ...entity,
      })
    ) {
      return Error400("Deployment failed: Invalid entity schema")
    }

    // then validate all files are part of the entity
    for (const hash in ctx.formData.files) {
      // detect extra file
      if (!entity.content!.some(($) => $.hash == hash) && hash !== entityId) {
        return Error400(`Deployment failed: Extra file detected ${hash}`)
      }
      // only new hashes
      if (!IPFSv2.validate(hash)) {
        return Error400("Deployment failed: Only CIDv1 are allowed for content files")
      }
      // hash the file
      if ((await hashV1(ctx.formData.files[hash].value)) !== hash) {
        return Error400("Deployment failed: The hashed file doesn't match the provided content")
      }
    }

    const allContentHashes = Array.from(new Set(entity.content!.map(($) => $.hash)))
    const allContentHashesInStorage = await ctx.components.storage.existMultiple(allContentHashes)

    // then ensure that all missing files are uploaded
    for (const file of entity.content!) {
      const isFilePresent = ctx.formData.files[file.hash] || allContentHashesInStorage.get(file.hash)
      if (!isFilePresent) {
        return Error400(
          `Deployment failed: The file ${file.hash} (${file.file}) is neither present in the storage or in the provided entity`
        )
      }
    }

    // TODO: run proper validations

    // store all files
    for (const file of entity.content!) {
      if (!allContentHashesInStorage.get(file.hash)) {
        const filename = entity.content!.find(($) => $.hash == file.hash)
        logger.info(`Storing file`, { cid: file.hash, filename: filename?.file || "unknown" })
        await ctx.components.storage.storeStream(file.hash, bufferToStream(ctx.formData.files[file.hash].value))
        allContentHashesInStorage.set(file.hash, true)
      }
    }

    // TODO Read already existing entity (if any) and remove all its files (to avoid leaving orphaned files)

    logger.info(`Storing entity`, { cid: entityId })
    await ctx.components.storage.storeStream(entityId, bufferToStream(stringToUtf8Bytes(entityRaw)))
    await ctx.components.storage.storeStream(
      entityId + ".auth",
      bufferToStream(stringToUtf8Bytes(JSON.stringify(authChain)))
    )
    await ctx.components.storage.storeStream(
      names[0].toLowerCase() + ".dcl.eth",
      bufferToStream(stringToUtf8Bytes(JSON.stringify({ entityId: entityId })))
    )

    const baseUrl = buildUrl(ctx.url, '/entities', ``)

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
            Message: JSON.stringify(deploymentToSqs),
          })
          .promise()
      logger.info("notification sent", {
        MessageId: receipt.MessageId as any,
        SequenceNumber: receipt.SequenceNumber as any,
      })
    }

    const worldUrl = buildUrl(ctx.url, '/entities', `/world/${names[0]}.dcl.eth`)
    const ipfsUrl = buildUrl(ctx.url, '/entities', '/ipfs')
    const urn = `urn:decentraland:entity:${entityId}?baseUrl=${ipfsUrl}`

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
          `Preview as Space: https://play.decentraland.zone/?SPACE=${encodeURIComponent(
            urn
          )}`,
          `Preview as World: https://play.decentraland.zone/?realm=${encodeURIComponent(
            worldUrl
          )}`,
        ].join("\n"),
      },
    }
  } catch (err: any) {
    console.error(err)
    logger.error(err)
    throw err
  }
}
