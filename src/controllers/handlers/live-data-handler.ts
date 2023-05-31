import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function getLiveDataHandler(
  context: HandlerContextWithPath<'commsAdapter', '/live-data'>
): Promise<IHttpServerComponent.IResponse> {
  const { commsAdapter } = context.components

  const commsStatus = await commsAdapter.status()

  const data = {
    totalUsers: commsStatus.users,
    perWorld: commsStatus.details
  }

  return {
    status: 200,
    body: { data: data, lastUpdated: new Date(commsStatus.timestamp).toISOString() }
  }
}
