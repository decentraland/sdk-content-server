import { AppComponents, DeploymentToValidate, Validation, ValidationResult, Validator } from '../types'
import { AuthChain, Entity, EthAddress, IPFSv2 } from '@dcl/schemas'
import { stringToUtf8Bytes } from 'eth-connect'
import { Authenticator } from '@dcl/crypto'
import { hashV1 } from '@dcl/hashing'

const maxSizeInMB = 15

const createValidationResult = (errors: string[]) => {
  return {
    ok: () => errors.length === 0,
    errors
  }
}

const OK = createValidationResult([])

const validateFiles: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const errors: string[] = []

    // validate all files are part of the entity
    for (const hash in deployment.files) {
      // detect extra file
      if (!deployment.entity.content!.some(($) => $.hash == hash) && hash !== deployment.entity.id) {
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

const validateSize: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
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

    const errors: string[] = []
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024

    try {
      const totalSize = await calculateDeploymentSize(deployment.entity, deployment.files)
      const sizePerPointer = totalSize / deployment.entity.pointers.length
      if (sizePerPointer > maxSizeInBytes) {
        errors.push(
          `The deployment is too big. The maximum allowed size per pointer is ${maxSizeInMB} MB for scenes. You can upload up to ${
            deployment.entity.pointers.length * maxSizeInBytes
          } bytes but you tried to upload ${totalSize}.`
        )
      }
    } catch (e: any) {
      errors.push(e.message)
    }

    return createValidationResult(errors)
  }
}

const validateEntity: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    Entity.validate(deployment.entity)

    return createValidationResult(Entity.validate.errors?.map((error) => error.message || '') || [])
  }
}

const validateEntityId: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const entityRaw = deployment.files.get(deployment.entity.id)!.toString()
    const result = (await hashV1(stringToUtf8Bytes(entityRaw))) === deployment.entity.id

    return createValidationResult(!result ? ['Invalid entity hash'] : [])
  }
}

const validateDeploymentTtl: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
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

const validateAuthChain: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const result = AuthChain.validate(deployment.authChain)
    if (!result) {
      console.dir(deployment.authChain)
      console.dir(AuthChain.validate.errors)
    }

    return createValidationResult(AuthChain.validate.errors?.map((error) => error.message || '') || [])
  }
}

const validateSigner: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    const signer = deployment.authChain[0].payload
    EthAddress.validate(signer)

    return createValidationResult(EthAddress.validate.errors?.map((error) => error.message || '') || [])
  }
}

const validateSignature: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
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

const validateDclName: Validation = {
  validate: async (
    components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>,
    deployment: DeploymentToValidate
  ): Promise<ValidationResult> => {
    // validate that the signer has permissions to deploy this scene. TheGraph only responds to lower cased addresses
    const signer = deployment.authChain[0].payload
    const names = await components.dclNameChecker.fetchNamesOwnedByAddress(signer)
    const hasPermission = names.length > 0
    if (!hasPermission) {
      return createValidationResult([
        `Deployment failed: Your wallet has no permission to publish to this server because it doesn't own a Decentraland NAME.`
      ])
    }

    const sceneJson = JSON.parse(deployment.files.get(deployment.entity.id)!.toString())
    const worldSpecifiedName: string | undefined = sceneJson.metadata.worldConfiguration?.dclName

    if (
      worldSpecifiedName !== undefined &&
      !names
        .map((name) => name.toLowerCase())
        .includes(worldSpecifiedName.substring(0, worldSpecifiedName.length - 8).toLowerCase())
    )
      return createValidationResult([
        `Deployment failed: Your wallet has no permission to publish to this server because it doesn\'t own Decentraland NAME "${sceneJson.metadata.worldConfiguration?.dclName}". Check scene.json to select a different name.`
      ])

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
  validateFiles
]

const slowValidations: Validation[] = [validateSize, validateDclName]

/**
 * Run quick validations first and, if all pass, then go for the slow ones
 */
const validations: Validation[] = [...quickValidations, ...slowValidations]

export const createValidator = (
  components: Pick<AppComponents, 'config' | 'dclNameChecker' | 'ethereumProvider' | 'storage'>
): Validator => ({
  async validate(deployment: DeploymentToValidate): Promise<ValidationResult> {
    for (const validation of validations) {
      const result = await validation.validate(components, deployment)
      if (!result.ok()) {
        return result
      }
    }

    return OK
  }
})
