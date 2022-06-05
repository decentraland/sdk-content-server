import { EthAddress } from "@dcl/schemas"
import { AppComponents } from "../types"

// https://config.decentraland.org/allowed-pushers-px.json
type RemoteConfig = {
  allowedSigners: Record<string, EthAddress>
}

export const REMOTE_CONFIG_URL = "https://config.decentraland.org/allowed-pushers-px.json"

export async function fetchAllowedAddresses(components: Pick<AppComponents, "fetch">) {
  const res = await components.fetch.fetch(REMOTE_CONFIG_URL)
  const body: RemoteConfig = await res.json()
  return Object.values(body.allowedSigners)
}
