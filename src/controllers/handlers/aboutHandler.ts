import { HandlerContextWithPath } from '../../types'
import { AboutResponse } from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'

export async function aboutHandler({
  components: { config, status }
}: Pick<HandlerContextWithPath<'config' | 'status', '/about'>, 'components'>) {
  const networkId = await config.requireNumber('NETWORK_ID')
  const fixedAdapter = await config.requireString('COMMS_FIXED_ADAPTER')

  const scenesURN = await config.requireString('SCENES_URN')
  const globalScenesURN = await config.getString('GLOBAL_SCENES_URN')

  const contentStatus = await status.getContentStatus()
  const lambdasStatus = await status.getLambdasStatus()

  const healthy = contentStatus.healthy && lambdasStatus.healthy
  const body: AboutResponse = {
    healthy,
    acceptingUsers: healthy,
    configurations: {
      networkId,
      globalScenesUrn: globalScenesURN ? globalScenesURN.split(' ') : [],
      scenesUrn: scenesURN.split(' '),
      minimap: {
        enabled: true
      },
      skybox: {}
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
      fixedAdapter
    }
  }

  return {
    status: 200,
    body
  }
}
