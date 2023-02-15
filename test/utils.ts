import { createUnsafeIdentity } from '@dcl/crypto/dist/crypto'
import { Authenticator } from '@dcl/crypto'
import { Readable } from 'stream'
import { IContentStorageComponent } from '@dcl/catalyst-storage'
import { stringToUtf8Bytes } from 'eth-connect'
import { AuthChain } from '@dcl/schemas'
import {
  AUTH_CHAIN_HEADER_PREFIX,
  AUTH_METADATA_HEADER,
  AUTH_TIMESTAMP_HEADER
} from 'decentraland-crypto-middleware/lib/types'

export async function storeJson(storage: IContentStorageComponent, fileId: string, data: any) {
  const buffer = stringToUtf8Bytes(JSON.stringify(data))
  let index = 0

  return await storage.storeStream(
    fileId,
    new Readable({
      read(size) {
        const readSize = Math.min(index + size, buffer.length - index)
        if (readSize === 0) {
          this.push(null)
          return
        }
        this.push(buffer.subarray(index, readSize))
        index += readSize
      }
    })
  )
}

export async function getIdentity() {
  const ephemeralIdentity = createUnsafeIdentity()
  const realAccount = createUnsafeIdentity()

  const authChain = await Authenticator.initializeAuthChain(
    realAccount.address,
    ephemeralIdentity,
    10,
    async (message) => {
      return Authenticator.createSignature(realAccount, message)
    }
  )

  return { authChain, realAccount, ephemeralIdentity }
}

export function getAuthHeaders(
  method: string,
  path: string,
  metadata: Record<string, any>,
  chainProvider: (payload: string) => AuthChain
) {
  const headers: Record<string, string> = {}
  const timestamp = Date.now()
  const metadataJSON = JSON.stringify(metadata)
  const payloadParts = [method.toLowerCase(), path.toLowerCase(), timestamp.toString(), metadataJSON]
  const payloadToSign = payloadParts.join(':').toLowerCase()

  const chain = chainProvider(payloadToSign)

  chain.forEach((link, index) => {
    headers[`${AUTH_CHAIN_HEADER_PREFIX}${index}`] = JSON.stringify(link)
  })

  headers[AUTH_TIMESTAMP_HEADER] = timestamp.toString()
  headers[AUTH_METADATA_HEADER] = metadataJSON

  return headers
}
