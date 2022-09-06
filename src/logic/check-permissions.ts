import { EthAddress } from "@dcl/schemas"
import { AppComponents } from "../types"

type NamesResponse = {
  names: { name: string }[]
}

export async function checkPermissionForAddress(components: Pick<AppComponents, "marketplaceSubGraph">, ethAddress: EthAddress): Promise<boolean> {
  const result = await components.marketplaceSubGraph.query<NamesResponse>(`
    query FetchNames($ethAddress: String) {
        names: nfts(where: { owner: $ethAddress, category: ens }, first: 1000) {
          name
        }
     }`,
      {
        ethAddress,
      }
  );

  return result.names.length > 0;
}
