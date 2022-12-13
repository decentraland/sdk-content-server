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
    ttl: 5 * 60 * 1000, // cache for 5 minutes
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

      const names = result.names.map(({ name }) => `${name.toLowerCase()}.dcl.eth`)

      components.logs.getLogger('check-permissions').debug(`Fetched names for address ${ethAddress}: ${names}`)
      return names
    }
  })
  const fetchNamesOwnedByAddress = async (ethAddress: EthAddress): Promise<string[]> => {
    // TheGraph only responds to lower cased addresses
    return (await cache.fetch(ethAddress.toLowerCase()))!
  }
  const determineDclNameToUse = async (ethAddress: EthAddress, sceneJson: any): Promise<string | undefined> => {
    const names = await fetchNamesOwnedByAddress(ethAddress)
    const requestedName = sceneJson.metadata.worldConfiguration?.dclName

    if (requestedName && names.includes(requestedName)) {
      return requestedName
    }

    return names[0]
  }

  return {
    fetchNamesOwnedByAddress,
    determineDclNameToUse
  }
}
