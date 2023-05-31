import { HandlerContextWithPath, StatusResponse } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function statusHandler(
  context: HandlerContextWithPath<'commsAdapter' | 'config' | 'worldsManager', '/status'>
): Promise<IHttpServerComponent.IResponse> {
  const { commsAdapter, config, worldsManager } = context.components

  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'

  const deployedWorlds = await worldsManager.getDeployedWorldsNames()
  const commsStatus = await commsAdapter.status()

  const status: StatusResponse = {
    content: {
      commitHash,
      worldsCount: deployedWorlds.length
    },
    comms: {
      ...commsStatus,
      details: undefined
    }
  }

  return {
    status: 200,
    body: status
  }
}
