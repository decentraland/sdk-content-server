import { EthAddress } from '@dcl/schemas'
import { AppComponents } from '../types'

type NamesResponse = {
  names: { name: string }[]
}

export async function fetchNamesOwnedByAddress(
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph'>,
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

  const names = result.names.map(({ name }) => name)

  components.logs.getLogger('check-permissions').debug(`Fetched names for address ${ethAddress}: ${names}`)
  return names
}

export function allowedToUseSpecifiedDclName(names: string[], sceneJson: any): boolean {
  const worldSpecifiedName: string | undefined = sceneJson.metadata.worldConfiguration?.dclName

  return (
    !worldSpecifiedName ||
    names
      .map((name) => name.toLowerCase())
      .includes(worldSpecifiedName.substring(0, worldSpecifiedName.length - 8).toLowerCase())
  )
}

export function determineDclNameToUse(names: string[], sceneJson: any): string {
  const worldSpecifiedName: string | undefined = sceneJson.metadata.worldConfiguration?.dclName
  return worldSpecifiedName?.substring(0, worldSpecifiedName?.length - 8) || names[0]
}
