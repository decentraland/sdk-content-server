import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { DecentralandSignatureContext } from 'decentraland-crypto-middleware/lib/types'
export async function commsAdapterHandler(
  context: HandlerContextWithPath<'commsResolver', '/get-comms-adapter/:roomId'> & DecentralandSignatureContext<any>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { commsResolver }
  } = context

  if (!validateMetadata(context.verification!.authMetadata)) {
    return {
      status: 400,
      body: {
        message: 'Access denied, invalid metadata'
      }
    }
  }

  return {
    status: 200,
    body: {
      fixedAdapter: await commsResolver.resolveComms(context.verification!.auth, context.params.roomId)
    }
  }
}

function validateMetadata(metadata: Record<string, any>): boolean {
  return metadata.signer === 'dcl:explorer' && metadata.intent === 'dcl:explorer:comms-handshake'
}
