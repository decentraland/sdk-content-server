import { EthAddress } from '@dcl/schemas'
import { IDclNameChecker } from '../src/types'

export function createMockDclNameChecker(): IDclNameChecker {
  return {
    determineDclNameToUse(names: string[], _sceneJson: any): string {
      if (names.length > 0) {
        return names[0]
      }
      throw Error("Can't use that name")
    },
    fetchNamesOwnedByAddress(_ethAddress: EthAddress): Promise<string[]> {
      return Promise.resolve([])
    }
  }
}
