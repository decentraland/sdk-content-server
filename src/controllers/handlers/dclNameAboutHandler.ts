import { HandlerContextWithPath } from "../../types"
import {
  AboutResponse,
  AboutResponse_MinimapConfiguration,
  AboutResponse_SkyboxConfiguration
} from "../../proto/http-endpoints.gen"
import { streamToBuffer } from "@dcl/catalyst-storage/dist/content-item";

export async function dclNameAboutHandler({
  params,
  url,
  components: { config, status, storage },
}: Pick<HandlerContextWithPath<"config" | "status" | "storage", "/world/:dcl_name/about">, "components" | "params" | "url">) {
  console.log({ url })
  // Retrieve
  const content = await storage.retrieve(params.dcl_name.toLowerCase()) // name should end with .dcl.eth
  if (!content) {
    return {
      status: 404,
      body: `DCL name "${params.dcl_name}" has no scene deployed.`
    }
  }

  const buffer = await streamToBuffer(await content?.asStream())
  const { entityId } = JSON.parse(buffer.toString())

  const scene = await storage.retrieve(entityId)
  if (!scene) {
    return {
      status: 404,
      body: `Scene "${entityId}" not deployed in this server.`
    }
  }
  const sceneJson = JSON.parse((await streamToBuffer(await scene?.asStream())).toString())

  const baseUrl = ((await config.getString("HTTP_BASE_URL")
      || `https://${url.host}`).toString())

  const urn = `urn:decentraland:entity:${entityId}?baseUrl=${baseUrl}/ipfs`

  const networkId = await config.requireNumber("NETWORK_ID")
  const fixedAdapter = await config.requireString("COMMS_FIXED_ADAPTER")
  const fixedAdapterPrefix = fixedAdapter.substring(0, fixedAdapter.lastIndexOf("/"))

  const globalScenesURN = await config.getString("GLOBAL_SCENES_URN")

  const contentStatus = await status.getContentStatus()
  const lambdasStatus = await status.getLambdasStatus()

  const minimap: AboutResponse_MinimapConfiguration = {
    enabled: sceneJson.metadata.worldConfiguration?.minimapVisible || false
  }
  if (sceneJson.metadata.worldConfiguration?.minimapVisible) {
    // TODO We may need allow the scene creator to specify these values
    minimap.dataImage = "https://api.decentraland.org/v1/minimap.png"
    minimap.estateImage = "https://api.decentraland.org/v1/estatemap.png"
  }

  const skybox: AboutResponse_SkyboxConfiguration = {
    fixedHour: sceneJson.metadata.worldConfiguration?.skybox
  }

  const body: AboutResponse = {
    healthy: contentStatus.healthy && lambdasStatus.healthy,
    configurations: {
      networkId,
      globalScenesUrn: globalScenesURN ? globalScenesURN.split(" ") : [],
      scenesUrn: [ urn ],
      minimap,
      skybox,
      realmName: params.dcl_name
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
