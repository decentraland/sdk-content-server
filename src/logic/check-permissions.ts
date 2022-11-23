import { EthAddress } from '@dcl/schemas'
import { AppComponents } from '../types'

type NamesResponse = {
  names: { name: string }[]
}

export async function fetchNamesOwnedByAddress(
  components: Pick<AppComponents, 'marketplaceSubGraph'>,
  ethAddress: EthAddress
): Promise<string[]> {
  const result = await components.marketplaceSubGraph.query<NamesResponse>(
    `
    query FetchNames($ethAddress: String) {
        names: nfts(where: { owner: $ethAddress, category: ens }, orderBy: name, first: 1000) {
          name
        }
     }`,
    {
      ethAddress
    }
  )

  return result.names.map(({ name }) => name)
}
