import { AppComponents, ICommsResolver } from '../types'
import { AccessToken } from 'livekit-server-sdk'

export async function createCommsResolverComponent({
  config,
  logs
}: Pick<AppComponents, 'config' | 'logs'>): Promise<ICommsResolver> {
  const logger = logs.getLogger('comms-resolver')

  const adapterType = await config.requireString('COMMS_ADAPTER')
  let resolveComms: (userId: string, roomId: string) => Promise<string>
  switch (adapterType) {
    case 'ws-room':
      const fixedAdapter = await config.requireString('COMMS_FIXED_ADAPTER')
      logger.info(`Using ws-room-service adapter with template baseUrl: ${fixedAdapter}`)
      resolveComms = getWsRoomAdapter(fixedAdapter)
      break

    case 'livekit':
      const host = await config.requireString('LIVEKIT_HOST')
      logger.info(`Using livekit adapter with host: ${host}`)
      const apiKey = await config.requireString('LIVEKIT_API_KEY')
      const apiSecret = await config.requireString('LIVEKIT_API_SECRET')
      resolveComms = getLiveKitAdapter(host, apiKey, apiSecret)
      break

    default:
      throw Error(`Invalid comms adapter: ${adapterType}`)
  }

  return {
    resolveComms
  }
}

function getWsRoomAdapter(fixedAdapter: string): (userId: string, roomId: string) => Promise<string> {
  const fixedAdapterPrefix = fixedAdapter.substring(0, fixedAdapter.lastIndexOf('/'))
  return async function getWsRoomServiceConnectionString(userId: string, roomId: string): Promise<string> {
    return `${fixedAdapterPrefix}/${roomId}`
  }
}

function getLiveKitAdapter(
  host: string,
  apiKey: string,
  apiSecret: string
): (userId: string, roomId: string) => Promise<string> {
  return async function getLiveKitConnectionString(userId: string, roomId: string): Promise<string> {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      ttl: 5 * 60 // 5 minutes
    })
    token.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true })
    return `livekit:${host}?access_token=${token.toJwt()}`
  }
}
