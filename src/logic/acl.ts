import { AccessControlList, ValidatorComponents } from '../types'
import { EthAddress } from '@dcl/schemas'

export async function allowedByAcl(
  components: Pick<ValidatorComponents, 'namePermissionChecker' | 'worldsManager'>,
  worldName: string,
  address: EthAddress
): Promise<boolean> {
  if (await components.namePermissionChecker.checkPermission(address, worldName)) {
    return true
  }

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
