import { ILimitsManager } from '../../src/types'

export function createMockLimitsManagerComponent(): ILimitsManager {
  const whitelist = {
    'privileged.dcl.eth': {
      max_parcels: 50,
      max_size_in_mb: 200,
      allow_sdk6: true
    }
  }

  return {
    async getAllowSdk6For(worldName: string): Promise<boolean> {
      return whitelist[worldName]?.allow_sdk6
    },
    async getMaxAllowedParcelsFor(worldName: string): Promise<number> {
      return whitelist[worldName]?.max_parcels || 4
    },
    async getMaxAllowedSizeInMbFor(worldName: string): Promise<number> {
      return whitelist[worldName]?.max_size_in_mb || 10
    }
  }
}
