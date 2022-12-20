import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function statusHandler(
  context: HandlerContextWithPath<'config' | 'worldsManager', '/status'>
): Promise<IHttpServerComponent.IResponse> {
  const { config, worldsManager } = context.components

  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'
  const secret = await config.getString('AUTH_SECRET')

  let showWorlds = false
  if (secret) {
    const token = context.request.headers.get('Authorization')?.substring(7) // Remove the "Bearer " part
    if (token && token === secret) {
      showWorlds = true
    }
  }
  const deployedWorlds = await worldsManager.getDeployedWorldsNames()

  return {
    status: 200,
    body: {
      commitHash,
      worldsCount: deployedWorlds.length,
      deployedWorlds: showWorlds ? deployedWorlds : undefined
    }
  }
}
