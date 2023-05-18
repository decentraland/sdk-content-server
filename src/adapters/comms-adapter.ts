import { AppComponents, CommsStatus, ICommsAdapter, WorldStatus } from '../types'
import { AccessToken } from 'livekit-server-sdk'
import { EthAddress } from '@dcl/schemas'
import LRU from 'lru-cache'

export async function createCommsAdapterComponent({
  config,
  fetch,
  logs
}: Pick<AppComponents, 'config' | 'fetch' | 'logs'>): Promise<ICommsAdapter> {
  const logger = logs.getLogger('comms-adapter')

  const roomPrefix = await config.requireString('COMMS_ROOM_PREFIX')
  const adapterType = await config.requireString('COMMS_ADAPTER')
  switch (adapterType) {
    case 'ws-room':
      const fixedAdapter = await config.requireString('COMMS_FIXED_ADAPTER')
      logger.info(`Using ws-room-service adapter with template baseUrl: ${fixedAdapter}`)
      return cachingAdapter({ logs }, createWsRoomAdapter({ fetch }, roomPrefix, fixedAdapter))

    case 'livekit':
      const host = await config.requireString('LIVEKIT_HOST')
      logger.info(`Using livekit adapter with host: ${host}`)
      const apiKey = await config.requireString('LIVEKIT_API_KEY')
      const apiSecret = await config.requireString('LIVEKIT_API_SECRET')
      return cachingAdapter({ logs }, createLiveKitAdapter({ fetch }, roomPrefix, host, apiKey, apiSecret))

    default:
      throw Error(`Invalid comms adapter: ${adapterType}`)
  }
}

function createWsRoomAdapter(
  { fetch }: Pick<AppComponents, 'fetch'>,
  roomPrefix: string,
  fixedAdapter: string
): ICommsAdapter {
  return {
    async status(): Promise<CommsStatus> {
      const url = fixedAdapter.substring(fixedAdapter.indexOf(':') + 1)
      const urlWithProtocol =
        !url.startsWith('ws:') && !url.startsWith('wss:') ? 'https://' + url : url.replace(/ws\[s]?:/, 'https')
      const statusUrl = urlWithProtocol.replace(/rooms\/.*/, 'status')

      return await fetch
        .fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then((response) => response.json())
        .then(
          (res: any): CommsStatus => ({
            adapterType: 'ws-room',
            statusUrl,
            commitHash: res.commitHash,
            rooms: res.rooms,
            users: res.users,
            details: res.details
              .filter((room: any) => room.roomName.startsWith(roomPrefix))
              .map((room: { roomName: string; count: number }): WorldStatus => {
                const { roomName, count } = room
                return { worldName: roomName.substring(roomPrefix.length), users: count }
              })
          })
        )
    },
    connectionString: async function (userId: EthAddress, roomId: string): Promise<string> {
      const roomsUrl = fixedAdapter.replace(/rooms\/.*/, 'rooms')
      return `${roomsUrl}/${roomId}`
    }
  }
}

function createLiveKitAdapter(
  { fetch }: Pick<AppComponents, 'fetch'>,
  roomPrefix: string,
  host: string,
  apiKey: string,
  apiSecret: string
): ICommsAdapter {
  return {
    async status(): Promise<CommsStatus> {
      const token = new AccessToken(apiKey, apiSecret, {
        name: 'SuperAdmin',
        ttl: 5 * 60 // 5 minutes
      })
      token.addGrant({ roomList: true })

      return await fetch
        .fetch(`https://${host}/twirp/livekit.RoomService/ListRooms`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.toJwt()}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        })
        .then((response) => response.json())
        .then((res: any): CommsStatus => {
          const roomList = res.rooms
            .filter((room: any) => room.name.startsWith(roomPrefix))
            .map((room: { name: string; num_participants: number }) => {
              const { name, num_participants } = room
              return { worldName: name.substring(roomPrefix.length), users: num_participants }
            })

          return {
            adapterType: 'livekit',
            statusUrl: `https://${host}/`,
            rooms: roomList.length,
            users: roomList.reduce((carry: number, value: WorldStatus) => carry + value.users, 0),
            details: roomList
          }
        })
    },

    async connectionString(userId: string, roomId: string, name: string | undefined = undefined): Promise<string> {
      const token = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name,
        ttl: 5 * 60 // 5 minutes
      })
      token.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true })
      return `livekit:wss://${host}?access_token=${token.toJwt()}`
    }
  }
}

function cachingAdapter({ logs }: Pick<AppComponents, 'logs'>, wrappedAdapter: ICommsAdapter): ICommsAdapter {
  const logger = logs.getLogger('caching-comms-adapter')

  const CACHE_KEY = 'comms_status'
  const cache = new LRU<string, CommsStatus>({
    max: 1,
    ttl: 60 * 1000, // cache for 1 minutes
    fetchMethod: async (_, staleValue): Promise<CommsStatus> => {
      try {
        return await wrappedAdapter.status()
      } catch (_: any) {
        logger.warn(`Error retrieving comms status: ${_.message}`)
        return staleValue
      }
    }
  })

  return {
    async status(): Promise<CommsStatus> {
      return (await cache.fetch(CACHE_KEY))!
    },

    async connectionString(userId: EthAddress, roomId: string): Promise<string> {
      return wrappedAdapter.connectionString(userId, roomId)
    }
  }
}
