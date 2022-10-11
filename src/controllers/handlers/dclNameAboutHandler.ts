import { HandlerContextWithPath } from "../../types"
import { AboutResponse } from "../../proto/http-endpoints.gen"
import { streamToBuffer } from "@dcl/catalyst-storage/dist/content-item";

export async function dclNameAboutHandler({
  params,
  components: { config, status, storage },
}: Pick<HandlerContextWithPath<"config" | "status" | "storage", "/:dcl_name/about">, "components" | "params">) {

  // Retrieve
  const content = await storage.retrieve(params.dcl_name + ".name")
  if (!content) {
    return {
      status: 404,
      body: `DCL name "${params.dcl_name}" has no scene deployed.`
    }
  }

  const buffer = await streamToBuffer(await content?.asStream())
  const { entityId } = JSON.parse(buffer.toString())

  const networkId = await config.requireNumber("NETWORK_ID")
  const fixedAdapter = await config.requireString("COMMS_FIXED_ADAPTER")
  const fixedAdapterPrefix = fixedAdapter.substring(0, fixedAdapter.lastIndexOf("/"))

  const globalScenesURN = await config.getString("GLOBAL_SCENES_URN")

  const contentStatus = await status.getContentStatus()
  const lambdasStatus = await status.getLambdasStatus()

  const body: AboutResponse = {
    healthy: contentStatus.healthy && lambdasStatus.healthy,
    configurations: {
      networkId,
      globalScenesUrn: globalScenesURN ? globalScenesURN.split(" ") : [],
      scenesUrn: [`urn:decentraland:entity:${entityId}`],
      minimap: {
        enabled: true,
      },
      skybox: {},
    },
    content: {
      healthy: contentStatus.healthy,
      publicUrl: contentStatus.publicUrl,
    },
    lambdas: {
      healthy: lambdasStatus.healthy,
      publicUrl: lambdasStatus.publicUrl,
    },
    comms: {
      healthy: true,
      protocol: "v3",
      fixedAdapter: `${fixedAdapterPrefix}/${entityId}`,
    },
  }

  return {
    status: 200,
    body,
  }
}
