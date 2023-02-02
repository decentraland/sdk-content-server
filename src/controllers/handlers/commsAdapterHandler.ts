import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { DecentralandSignatureContext } from 'decentraland-crypto-middleware/lib/types'

export async function commsAdapterHandler(
  context: HandlerContextWithPath<'commsAdapter' | 'config' | 'storage', '/get-comms-adapter/:roomId'> &
    DecentralandSignatureContext<any>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { commsAdapter, config, storage }
  } = context

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

  return {
    status: 200,
    body: {
      fixedAdapter: await commsAdapter.connectionString(context.verification!.auth, context.params.roomId)
    }
  }
}

function validateMetadata(metadata: Record<string, any>): boolean {
  return metadata.signer === 'dcl:explorer' && metadata.intent === 'dcl:explorer:comms-handshake'
}
