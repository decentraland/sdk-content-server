import { AppComponents } from '../types'
import { Entity } from '@dcl/schemas'

const maxSizeInMB = 15

export type ValidationResult = {
  ok: () => boolean
  errors: string[]
}

export const calculateDeploymentSize = async (
  { storage }: Pick<AppComponents, 'storage'>,
  entity: Entity,
  files: Map<string, Uint8Array>
): Promise<number> => {
  const fetchContentFileSize = async (hash: string): Promise<number> => {
    const content = await storage.retrieve(hash)
    if (!content) {
      throw Error(`Couldn't fetch content file with hash ${hash}`)
    }

    // Empty files are retrieved with size: null in aws-sdk
    return content.size || 0
  }

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

export const validateSize = async (
  components: Pick<AppComponents, 'storage'>,
  entity: Entity,
  files: Map<string, Uint8Array>
): Promise<ValidationResult> => {
  const errors: string[] = []
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024

  try {
    const totalSize = await calculateDeploymentSize(components, entity, files)
    const sizePerPointer = totalSize / entity.pointers.length
    if (sizePerPointer > maxSizeInBytes) {
      errors.push(
        `The deployment is too big. The maximum allowed size per pointer is ${maxSizeInMB} MB for scenes. You can upload up to ${
          entity.pointers.length * maxSizeInBytes
        } bytes but you tried to upload ${totalSize}.`
      )
    }
  } catch (e: any) {
    errors.push(e.message)
  }

  return {
    ok: () => errors.length === 0,
    errors
  }
}
