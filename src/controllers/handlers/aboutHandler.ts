import { HandlerContextWithPath } from "../../types"
import { AboutResponse } from "../../proto/http-endpoints.gen"

export async function aboutHandler({
  components: { config },
}: Pick<HandlerContextWithPath<"config", "/about">, "components">) {
  const networkId = await config.requireNumber("NETWORK_ID")
  const fixedAdapter = await config.requireString("COMMS_FIXED_ADAPTER")
  const lambdasURL = await config.requireString("LAMBDAS_URL")
  const contentURL = await config.requireString("CONTENT_URL")
  const scenesURN = await config.requireString("SCENES_URN")
  const globalScenesURN = await config.getString("GLOBAL_SCENES_URN")

  // TODO: add a proper health check for content and lambdas
  const body: AboutResponse = {
    healthy: true,
    configurations: {
      networkId,
      globalScenesUrn: globalScenesURN ? globalScenesURN.split(" ") : [],
      scenesUrn: scenesURN.split(" "),
    },
    content: {
      healthy: true,
      publicUrl: contentURL,
    },
    lambdas: {
      healthy: true,
      publicUrl: lambdasURL,
    },
    comms: {
      healthy: true,
      protocol: "v3",
      fixedAdapter,
    },
  }

  return {
    status: 200,
    body,
  }
}
