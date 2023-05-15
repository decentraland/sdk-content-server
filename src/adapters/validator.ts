import {
  AccessControlList,
  DeploymentToValidate,
  Validation,
  ValidationResult,
  Validator,
  ValidatorComponents
} from '../types'
import { AuthChain, Entity, EthAddress, IPFSv2 } from '@dcl/schemas'
import { Authenticator } from '@dcl/crypto'
import { hashV1 } from '@dcl/hashing'
import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'

const createValidationResult = (errors: string[]) => {
  return {
    ok: () => errors.length === 0,
    errors
  }
}

const OK = createValidationResult([])

export const validateEntity: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  if (!Entity.validate(deployment.entity)) {
    return createValidationResult(Entity.validate.errors?.map((error) => error.message || '') || [])
  }

  if (deployment.entity.metadata.worldConfiguration?.dclName) {
    return createValidationResult([
      '`dclName` in scene.json was renamed to `name`. Please update your scene.json accordingly.'
    ])
  }

  if (!deployment.entity.metadata.worldConfiguration?.name) {
    return createValidationResult([
      'scene.json needs to specify a worldConfiguration section with a valid name inside.'
    ])
  }
  return OK
}

export const validateEntityId: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const entityRaw = deployment.files.get(deployment.entity.id) || Buffer.from([])
  const result = (await hashV1(entityRaw)) === deployment.entity.id

  return createValidationResult(
    !result ? [`Invalid entity hash: expected ${await hashV1(entityRaw)} but got ${deployment.entity.id}`] : []
  )
}

export const validateDeploymentTtl: Validation = async (
  components: Pick<ValidatorComponents, 'config'>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const ttl = Date.now() - deployment.entity.timestamp
  const maxTtl = (await components.config.getNumber('DEPLOYMENT_TTL')) || 300_000
  if (ttl > maxTtl) {
    return createValidationResult([
      `Deployment was created ${ttl / 1000} secs ago. Max allowed: ${maxTtl / 1000} secs.`
    ])
  }
  return OK
}

export const validateAuthChain: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  if (!AuthChain.validate(deployment.authChain)) {
    return createValidationResult(AuthChain.validate.errors?.map((error) => error.message || '') || [])
  }

  return OK
}

export const validateSigner: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const signer = deployment.authChain[0].payload
  if (!EthAddress.validate(signer)) {
    return createValidationResult([`Invalid signer: ${signer}`])
  }

  return OK
}

export const validateSignature: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const result = await Authenticator.validateSignature(
    deployment.entity.id,
    deployment.authChain,
    components.ethereumProvider,
    10
  )

  return createValidationResult(result.message ? [result.message] : [])
}

export const validateDeploymentPermission: Validation = async (
  components: Pick<ValidatorComponents, 'namePermissionChecker' | 'worldsManager'>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
  const worldSpecifiedName = sceneJson.metadata.worldConfiguration.name
  const signer = deployment.authChain[0].payload

  const hasPermission = await components.namePermissionChecker.checkPermission(signer, worldSpecifiedName)
  if (!hasPermission) {
    async function allowedByAcl(worldName: string, address: EthAddress): Promise<boolean> {
      const worldMetadata = await components.worldsManager.getMetadataForWorld(worldName)
      if (!worldMetadata || !worldMetadata.acl) {
        // No acl -> no permission
        return false
      }

      const acl = JSON.parse(worldMetadata.acl.slice(-1).pop()!.payload) as AccessControlList
      const isAllowed = acl.allowed.some((allowedAddress) => allowedAddress.toLowerCase() === address.toLowerCase())
      if (!isAllowed) {
        // There is acl but requested address is not included in the allowed ones
        return false
      }

      // The acl allows permissions, finally check that the signer of the acl still owns the world
      const aclSigner = worldMetadata.acl[0].payload
      return components.namePermissionChecker.checkPermission(aclSigner, worldName)
    }

    const allowed = await allowedByAcl(worldSpecifiedName, signer)
    if (!allowed) {
      return createValidationResult([
        `Deployment failed: Your wallet has no permission to publish this scene because it does not have permission to deploy under "${worldSpecifiedName}". Check scene.json to select a name that either you own or you were given permission to deploy.`
      ])
    }
  }

  return OK
}

export const validateSceneDimensions: Validation = async (
  components: Pick<ValidatorComponents, 'limitsManager'>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
  const worldName = sceneJson.metadata.worldConfiguration.name

  const maxParcels = await components.limitsManager.getMaxAllowedParcelsFor(worldName || '')
  if (deployment.entity.pointers.length > maxParcels) {
    return createValidationResult([`Max allowed scene dimensions is ${maxParcels} parcels.`])
  }

  return OK
}

export const validateFiles: Validation = async (
  components: Partial<ValidatorComponents>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const errors: string[] = []

  // validate all files are part of the entity
  for (const [hash] of deployment.files) {
    // detect extra file
    if (!deployment.entity.content!.some(($) => $.hash === hash) && hash !== deployment.entity.id) {
      errors.push(`Extra file detected ${hash}`)
    }
    // only new hashes
    if (!IPFSv2.validate(hash)) {
      errors.push(`Only CIDv1 are allowed for content files: ${hash}`)
    }
    // hash the file
    if ((await hashV1(deployment.files.get(hash)!)) !== hash) {
      errors.push(`The hashed file doesn't match the provided content: ${hash}`)
    }
  }

  // then ensure that all missing files are uploaded
  for (const file of deployment.entity.content!) {
    const isFilePresent = deployment.files.has(file.hash) || deployment.contentHashesInStorage.get(file.hash)
    if (!isFilePresent) {
      errors.push(`The file ${file.hash} (${file.file}) is neither present in the storage or in the provided entity`)
    }
  }

  return createValidationResult(errors)
}

export const validateSize: Validation = async (
  components: Pick<ValidatorComponents, 'limitsManager' | 'storage'>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const fetchContentFileSize = async (hash: string): Promise<number> => {
    const content = await components.storage.retrieve(hash)
    if (!content) {
      throw Error(`Couldn't fetch content file with hash ${hash}`)
    }

    // Empty files are retrieved with size: null in aws-sdk
    return content.size || 0
  }

  const calculateDeploymentSize = async (entity: Entity, files: Map<string, Uint8Array>): Promise<number> => {
    let totalSize = 0
    for (const hash of new Set(entity.content?.map((item) => item.hash) ?? [])) {
      const uploadedFile = files.get(hash)
      if (uploadedFile) {
        totalSize += uploadedFile.byteLength
      } else {
        const contentSize = await fetchContentFileSize(hash)
        totalSize += contentSize
      }
    }
    return totalSize
  }

  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
  const worldName = sceneJson.metadata.worldConfiguration.name
  const maxTotalSizeInMB = await components.limitsManager.getMaxAllowedSizeInMbFor(worldName || '')

  const errors: string[] = []
  try {
    const deploymentSize = await calculateDeploymentSize(deployment.entity, deployment.files)
    if (deploymentSize > maxTotalSizeInMB * 1024 * 1024) {
      errors.push(
        `The deployment is too big. The maximum total size allowed is ${maxTotalSizeInMB} MB for scenes. You can upload up to ${
          maxTotalSizeInMB * 1024 * 1024
        } bytes but you tried to upload ${deploymentSize}.`
      )
    }
  } catch (e: any) {
    errors.push(e.message)
  }

  return createValidationResult(errors)
}

export const validateSdkVersion: Validation = async (
  components: Pick<ValidatorComponents, 'limitsManager' | 'storage'>,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
  const worldName = sceneJson.metadata.worldConfiguration.name
  const allowSdk6 = await components.limitsManager.getAllowSdk6For(worldName || '')

  const sdkVersion = deployment.entity.metadata.runtimeVersion
  if (sdkVersion !== '7' && !allowSdk6) {
    return createValidationResult([
      `Worlds are only supported on SDK 7. Please upgrade your scene to latest version of SDK.`
    ])
  }

  return OK
}

export const validateMiniMapImages: Validation = async (
  components: ValidatorComponents,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())

  const errors: string[] = []

  for (const imageFile of [
    sceneJson.metadata.worldConfiguration?.miniMapConfig?.dataImage,
    sceneJson.metadata.worldConfiguration?.miniMapConfig?.estateImage
  ]) {
    if (imageFile) {
      const isFilePresent = sceneJson.content.some((content: ContentMapping) => content.file === imageFile)
      if (!isFilePresent) {
        errors.push(`The file ${imageFile} is not present in the entity.`)
      }
    }
  }

  return createValidationResult(errors)
}

export const validateThumbnail: Validation = async (
  components: ValidatorComponents,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneThumbnail = deployment.entity.metadata?.display?.navmapThumbnail
  if (sceneThumbnail) {
    const isFilePresent = deployment.entity.content.some((content: ContentMapping) => content.file === sceneThumbnail)
    if (!isFilePresent) {
      return createValidationResult([`Scene thumbnail '${sceneThumbnail}' must be a file included in the deployment.`])
    }
  }

  return OK
}

export const validateSkyboxTextures: Validation = async (
  components: ValidatorComponents,
  deployment: DeploymentToValidate
): Promise<ValidationResult> => {
  const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())

  const errors: string[] = []

  for (const textureFile of sceneJson.metadata.worldConfiguration?.skyboxConfig?.textures || []) {
    if (textureFile) {
      const isFilePresent = sceneJson.content.some((content: ContentMapping) => content.file === textureFile)
      if (!isFilePresent) {
        errors.push(`The texture file ${textureFile} is not present in the entity.`)
      }
    }
  }

  return createValidationResult(errors)
}

const quickValidations: Validation[] = [
  validateEntityId,
  validateEntity,
  validateAuthChain,
  validateSigner,
  validateSignature,
  validateDeploymentTtl,
  validateSceneDimensions,
  validateFiles,
  validateMiniMapImages,
  validateSkyboxTextures,
  validateThumbnail
  // validateSdkVersion TODO re-enable (and test) once SDK7 is ready
]

const slowValidations: Validation[] = [validateSize, validateDeploymentPermission]

const allValidations: Validation[] = [...quickValidations, ...slowValidations]

export const createValidator = (components: ValidatorComponents): Validator => ({
  async validate(deployment: DeploymentToValidate): Promise<ValidationResult> {
    for (const validate of allValidations) {
      const result = await validate(components, deployment)
      if (!result.ok()) {
        return result
      }
    }

    return OK
  }
})
