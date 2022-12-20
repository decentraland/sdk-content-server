import { DeploymentToValidate, Validation, ValidationResult, Validator, ValidatorComponents } from '../types'
import { AuthChain, Entity, EthAddress, IPFSv2 } from '@dcl/schemas'
import { Authenticator } from '@dcl/crypto'
import { hashV1 } from '@dcl/hashing'

const createValidationResult = (errors: string[]) => {
  return {
    ok: () => errors.length === 0,
    errors
  }
}

const OK = createValidationResult([])

export const validateEntity: Validation = {
  validate: async (
    components: Partial<ValidatorComponents>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    if (!Entity.validate(deployment.entity)) {
      return createValidationResult(Entity.validate.errors?.map((error) => error.message || '') || [])
    }
    return OK
  }
}

export const validateEntityId: Validation = {
  validate: async (
    components: Partial<ValidatorComponents>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const entityRaw = deployment.files.get(deployment.entity.id) || Buffer.from([])
    const result = (await hashV1(entityRaw)) === deployment.entity.id

    return createValidationResult(
      !result ? [`Invalid entity hash: expected ${await hashV1(entityRaw)} but got ${deployment.entity.id}`] : []
    )
  }
}

export const validateDeploymentTtl: Validation = {
  validate: async (
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
}

export const validateAuthChain: Validation = {
  validate: async (
    components: Partial<ValidatorComponents>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    if (!AuthChain.validate(deployment.authChain)) {
      return createValidationResult(AuthChain.validate.errors?.map((error) => error.message || '') || [])
    }

    return OK
  }
}

export const validateSigner: Validation = {
  validate: async (
    components: Partial<ValidatorComponents>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const signer = deployment.authChain[0].payload
    if (!EthAddress.validate(signer)) {
      return createValidationResult([`Invalid signer: ${signer}`])
    }

    return OK
  }
}

export const validateSignature: Validation = {
  validate: async (
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
}

export const validateDclName: Validation = {
  validate: async (
    components: Pick<ValidatorComponents, 'dclNameChecker'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    // validate that the signer has permissions to deploy this scene.
    const signer = deployment.authChain[0].payload
    const names = await components.dclNameChecker.fetchNamesOwnedByAddress(signer)
    if (names.length === 0) {
      return createValidationResult([
        `Deployment failed: Your wallet has no permission to publish to this server because it doesn't own a Decentraland NAME.`
      ])
    }

    const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
    const worldSpecifiedName: string | undefined = sceneJson.metadata.worldConfiguration?.dclName

    if (
      worldSpecifiedName !== undefined &&
      !names.map((name) => name.toLowerCase()).includes(worldSpecifiedName.toLowerCase())
    )
      return createValidationResult([
        `Deployment failed: Your wallet has no permission to publish to this server because it doesn\'t own Decentraland NAME "${sceneJson.metadata.worldConfiguration?.dclName}". Check scene.json to select a different name.`
      ])

    return OK
  }
}

export const validateSceneDimensions: Validation = {
  validate: async (
    components: Pick<ValidatorComponents, 'dclNameChecker' | 'limitsManager'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const signer = deployment.authChain[0].payload
    const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
    const worldName = await components.dclNameChecker.determineDclNameToUse(signer, sceneJson)

    const maxParcels = await components.limitsManager.getMaxAllowedParcelsFor(worldName || '')
    if (deployment.entity.pointers.length > maxParcels) {
      return createValidationResult([`Max allowed scene dimensions is ${maxParcels} parcels.`])
    }

    return OK
  }
}

export const validateFiles: Validation = {
  validate: async (
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
}

export const validateSize: Validation = {
  validate: async (
    components: Pick<ValidatorComponents, 'dclNameChecker' | 'limitsManager' | 'storage'>,
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

    const signer = deployment.authChain[0].payload
    const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
    const worldName = await components.dclNameChecker.determineDclNameToUse(signer, sceneJson)
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
}

export const validateSdkVersion: Validation = {
  validate: async (
    components: Pick<ValidatorComponents, 'dclNameChecker' | 'limitsManager' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const signer = deployment.authChain[0].payload
    const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
    const worldName = await components.dclNameChecker.determineDclNameToUse(signer, sceneJson)
    const allowSdk6 = await components.limitsManager.getAllowSdk6For(worldName || '')

    const sdkVersion = deployment.entity.metadata.runtimeVersion
    if (sdkVersion !== '7' && !allowSdk6) {
      return createValidationResult([
        `Worlds are only supported on SDK 7. Please upgrade your scene to latest version of SDK.`
      ])
    }

    return OK
  }
}

const quickValidations: Validation[] = [
  validateEntityId,
  validateEntity,
  validateAuthChain,
  validateSigner,
  validateSignature,
  validateDeploymentTtl,
  validateSceneDimensions,
  validateFiles
  // validateSdkVersion TODO re-enable (and test) once SDK7 is ready
]

const slowValidations: Validation[] = [validateSize, validateDclName]

/**
 * Run quick validations first and, if all pass, then go for the slow ones
 */
const allValidations: Validation[] = [...quickValidations, ...slowValidations]

export const createValidator = (components: ValidatorComponents): Validator => ({
  async validate(deployment: DeploymentToValidate): Promise<ValidationResult> {
    for (const validation of allValidations) {
      const result = await validation.validate(components, deployment)
      if (!result.ok()) {
        return result
      }
    }

    return OK
  }
})
