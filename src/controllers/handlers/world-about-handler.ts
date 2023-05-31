import { HandlerContextWithPath } from '../../types'
import {
  AboutResponse,
  AboutResponse_MinimapConfiguration,
  AboutResponse_SkyboxConfiguration
} from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'
import { streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'
import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'

export async function worldAboutHandler({
  params,
  url,
  components: { config, status, storage, worldsManager }
}: Pick<
  HandlerContextWithPath<'config' | 'status' | 'storage' | 'worldsManager', '/world/:world_name/about'>,
  'components' | 'params' | 'url'
>) {
  const entityId = await worldsManager.getEntityIdForWorld(params.world_name)
  if (!entityId) {
    return {
      status: 404,
      body: `World "${params.world_name}" has no scene deployed.`
    }
  }

  const scene = await storage.retrieve(entityId)
  if (!scene) {
    return {
      status: 404,
      body: `Scene "${entityId}" not deployed in this server.`
    }
  }
  const sceneJson = JSON.parse((await streamToBuffer(await scene?.asStream())).toString())

  const baseUrl = (await config.getString('HTTP_BASE_URL')) || `${url.protocol}//${url.host}`

  const urn = `urn:decentraland:entity:${entityId}?=&baseUrl=${baseUrl}/contents/`

  const networkId = await config.requireNumber('NETWORK_ID')
  const roomPrefix = await config.requireString('COMMS_ROOM_PREFIX')
  const fixedAdapter = await resolveFixedAdapter(params.world_name, sceneJson, baseUrl, roomPrefix)

  const globalScenesURN = await config.getString('GLOBAL_SCENES_URN')

  const contentStatus = await status.getContentStatus()
  const lambdasStatus = await status.getLambdasStatus()

  function urlForFile(filename: string, defaultImage: string = ''): string {
    if (filename) {
      const file = sceneJson.content.find((content: ContentMapping) => content.file === filename)
      if (file) {
        return `${baseUrl}/contents/${file.hash}`
      }
    }
    return defaultImage
  }

  const minimap: AboutResponse_MinimapConfiguration = {
    enabled:
      sceneJson.metadata.worldConfiguration?.minimapVisible ||
      sceneJson.metadata.worldConfiguration?.miniMapConfig?.visible ||
      false
  }
  if (minimap.enabled || sceneJson.metadata.worldConfiguration?.miniMapConfig?.dataImage) {
    minimap.dataImage = urlForFile(
      sceneJson.metadata.worldConfiguration?.miniMapConfig?.dataImage,
      'https://api.decentraland.org/v1/minimap.png'
    )
  }
  if (minimap.enabled || sceneJson.metadata.worldConfiguration?.miniMapConfig?.estateImage) {
    minimap.estateImage = urlForFile(
      sceneJson.metadata.worldConfiguration?.miniMapConfig?.estateImage,
      'https://api.decentraland.org/v1/estatemap.png'
    )
  }

  const skybox: AboutResponse_SkyboxConfiguration = {
    fixedHour:
      sceneJson.metadata.worldConfiguration?.skyboxConfig?.fixedHour || sceneJson.metadata.worldConfiguration?.skybox,
    textures: sceneJson.metadata.worldConfiguration?.skyboxConfig?.textures
      ? sceneJson.metadata.worldConfiguration?.skyboxConfig?.textures.map((texture: string) => urlForFile(texture))
      : undefined
  }

  const healthy = contentStatus.healthy && lambdasStatus.healthy
  const body: AboutResponse = {
    healthy,
    acceptingUsers: healthy,
    configurations: {
      networkId,
      globalScenesUrn: globalScenesURN ? globalScenesURN.split(' ') : [],
      scenesUrn: [urn],
      minimap,
      skybox,
      realmName: params.world_name
    },
    content: {
      healthy: contentStatus.healthy,
      publicUrl: contentStatus.publicUrl
    },
    lambdas: {
      healthy: lambdasStatus.healthy,
      publicUrl: lambdasStatus.publicUrl
    },
    comms: {
      healthy: true,
      protocol: 'v3',
      fixedAdapter: fixedAdapter
    }
  }

  return {
    status: 200,
    body
  }
}

async function resolveFixedAdapter(worldName: string, sceneJson: any, baseUrl: string, roomPrefix: string) {
  if (sceneJson.metadata.worldConfiguration?.fixedAdapter === 'offline:offline') {
    return 'offline:offline'
  }

  return `signed-login:${baseUrl}/get-comms-adapter/${roomPrefix}${worldName.toLowerCase()}`
}
