import { HandlerContextWithPath, StatusResponse } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function statusHandler(
  context: HandlerContextWithPath<'commsAdapter' | 'config' | 'worldsManager', '/status'>
): Promise<IHttpServerComponent.IResponse> {
  const { commsAdapter, config, worldsManager } = context.components

  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'
  const secret = await config.getString('AUTH_SECRET')

  let showDetails = false
  if (secret) {
    const token = context.request.headers.get('Authorization')?.substring(7) // Remove the "Bearer " part
    if (token && token === secret) {
      showDetails = true
    }
  }

  const deployedWorlds = await worldsManager.getDeployedWorldsNames()
  const commsStatus = await commsAdapter.status()

  const status: StatusResponse = {
    content: {
      commitHash,
      worldsCount: deployedWorlds.length,
      details: showDetails ? deployedWorlds : undefined
    },
    comms: {
      ...commsStatus,
      details: showDetails ? commsStatus.details : undefined
    }
  }

  return {
    status: 200,
    body: status
  }
}
