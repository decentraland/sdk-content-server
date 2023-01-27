import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { DecentralandSignatureContext } from 'decentraland-crypto-middleware/lib/types'

export async function commsAdapterHandler(
  context: HandlerContextWithPath<'commsResolver', '/get-comms-adapter/:roomId'> & DecentralandSignatureContext<any>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { commsResolver }
  } = context

  const fixedAdapter = await commsResolver.resolveComms(context.verification!.auth, context.params.roomId)

  return {
    status: 200,
    body: {
      fixedAdapter
    }
  }
}
