import { AppComponents, IDclNameChecker } from '../types'
import { EthAddress } from '@dcl/schemas'
import LRU from 'lru-cache'

type NamesResponse = {
  names: { name: string }[]
}

export const createDclNameChecker = (
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph'>
): IDclNameChecker => {
  const cache = new LRU<EthAddress, string[]>({
    max: 100,
    ttl: 1000 * 60 * 5, // cache for 5 minutes
    fetchMethod: async (ethAddress: EthAddress): Promise<string[]> => {
      const result = await components.marketplaceSubGraph.query<NamesResponse>(
        `
      query FetchNames($ethAddress: String) {
          names: nfts(where: { owner: $ethAddress, category: ens }, orderBy: name, first: 1000) {
            name
          }
       }`,
        {
          ethAddress: ethAddress.toLowerCase()
        }
      )

      const names = result.names.map(({ name }) => name)

      components.logs.getLogger('check-permissions').debug(`Fetched names for address ${ethAddress}: ${names}`)
      return names
    }
  })
  return {
    async fetchNamesOwnedByAddress(ethAddress: EthAddress): Promise<string[]> {
      return (await cache.fetch(ethAddress))!
    },

    determineDclNameToUse(names: string[], sceneJson: any): string {
      const worldSpecifiedName: string | undefined = sceneJson.metadata.worldConfiguration?.dclName
      return worldSpecifiedName?.substring(0, worldSpecifiedName?.length - 8) || names[0]
    }
  }
}
