import { EthAddress } from '@dcl/schemas'
import { IDclNameChecker } from '../../src/types'

export function createMockDclNameChecker(names?: string[]): IDclNameChecker {
  const fetchNamesOwnedByAddress = async (_ethAddress: EthAddress): Promise<string[]> => {
    return Promise.resolve(names || [])
  }

  const determineDclNameToUse = async (ethAddress: EthAddress, sceneJson: any): Promise<string> => {
    const names = await fetchNamesOwnedByAddress(ethAddress)
    const requestedName = sceneJson.metadata.worldConfiguration?.dclName

    if (requestedName && names.includes(requestedName)) {
      return requestedName
    }

    return names[0]
  }

  return {
    determineDclNameToUse,
    fetchNamesOwnedByAddress
  }
}
