import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { DecentralandSignatureContext } from 'decentraland-crypto-middleware/lib/types'
import verify from 'decentraland-crypto-middleware/lib/verify'
import { allowedByAcl } from '../../logic/acl'

export async function meetAdapterHandler(
  context: HandlerContextWithPath<
    'commsAdapter' | 'config' | 'storage' | 'namePermissionChecker' | 'worldsManager',
    '/meet-adapter/:roomId'
  > &
    DecentralandSignatureContext<any>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { commsAdapter, config, storage }
  } = context

  const baseUrl = (
    (await config.getString('HTTP_BASE_URL')) || `${context.url.protocol}//${context.url.host}`
  ).toString()
  const path = new URL(baseUrl + context.url.pathname)

  try {
    context.verification = await verify(context.request.method, path.pathname, context.request.headers.raw(), {})
  } catch (e) {
    return {
      status: 401,
      body: {
        ok: false,
        message: 'Access denied, invalid signed-fetch request'
      }
    }
  }

  if (!validateMetadata(context.verification!.authMetadata)) {
    return {
      status: 400,
      body: {
        message: 'Access denied, invalid metadata'
      }
    }
  }

  const roomPrefix = await config.requireString('COMMS_ROOM_PREFIX')
  if (!context.params.roomId.startsWith(roomPrefix)) {
    return {
      status: 400,
      body: {
        message: 'Invalid room id requested.'
      }
    }
  }

  const worldName = context.params.roomId.substring(roomPrefix.length)

  if (!(await storage.exist('name-' + worldName))) {
    return {
      status: 404,
      body: {
        message: `World "${worldName}" does not exist.`
      }
    }
  }

  const hasPermission = await allowedByAcl(context.components, worldName, context.verification!.auth)
  if (!hasPermission) {
    return {
      status: 401,
      body: {
        message: 'Only the owner can get a publisher token'
      }
    }
  }

  return {
    status: 200,
    body: {
      fixedAdapter: await commsAdapter.connectionString(
        '0x0000000000000000000000000000000000000000',
        context.params.roomId,
        worldName
      )
    }
  }
}

function validateMetadata(metadata: Record<string, any>): boolean {
  return metadata.signer === 'dcl:explorer' && metadata.intent === 'dcl:explorer:comms-handshake'
}
