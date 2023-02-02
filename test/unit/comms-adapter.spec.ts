import { createConfigComponent } from '@well-known-components/env-config-provider'
import { IConfigComponent } from '@well-known-components/interfaces'
import { createCommsAdapterComponent } from '../../src/adapters/comms-adapter'
import { createLogComponent } from '@well-known-components/logger'
import { IFetchComponent } from '@well-known-components/http-server'
import { Request, Response } from 'node-fetch'

describe('comms-adapter', function () {
  describe('ws-room', function () {
    it('resolves connection string when well configured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'ws-room',
        COMMS_FIXED_ADAPTER: 'ws-room:ws-room-service.decentraland.org/rooms/test-scene',
        COMMS_ROOM_PREFIX: 'world-prd-'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => new Response(undefined)
      }

      const commsAdapter = await createCommsAdapterComponent({ config, fetch, logs })

      expect(await commsAdapter.connectionString('0xA', 'my-room')).toBe(
        'ws-room:ws-room-service.decentraland.org/rooms/my-room'
      )
    })

    it('resolves status when well configured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'ws-room',
        COMMS_FIXED_ADAPTER: 'ws-room:ws-room-service.decentraland.org/rooms/test-scene',
        COMMS_ROOM_PREFIX: 'world-prd-'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> =>
          new Response(
            JSON.stringify({
              commitHash: 'unknown',
              users: 2,
              rooms: 1,
              details: [
                {
                  roomName: 'world-prd-mariano.dcl.eth',
                  count: 2
                }
              ]
            })
          )
      }

      const commsAdapter = await createCommsAdapterComponent({ config, fetch, logs })

      expect(await commsAdapter.status()).toMatchObject({
        rooms: 1,
        users: 2,
        details: [
          {
            users: 2,
            worldName: 'mariano.dcl.eth'
          }
        ]
      })
    })

    it('refuses to initialize when misconfigured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'ws-room',
        COMMS_ROOM_PREFIX: 'world-prd-'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => new Response(undefined)
      }

      await expect(createCommsAdapterComponent({ config, fetch, logs })).rejects.toThrow(
        'Configuration: string COMMS_FIXED_ADAPTER is required'
      )
    })
  })

  describe('livekit', function () {
    it('resolves connection string when well configured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'livekit',
        COMMS_ROOM_PREFIX: 'world-',
        LIVEKIT_HOST: 'livekit.dcl.org',
        LIVEKIT_API_KEY: 'myApiKey',
        LIVEKIT_API_SECRET: 'myApiSecret'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => new Response(undefined)
      }

      const commsAdapter = await createCommsAdapterComponent({ config, fetch, logs })

      const adapter = await commsAdapter.connectionString('0xA', 'my-room')
      expect(adapter).toContain('livekit:wss://livekit.dcl.org?access_token=')
    })

    it('resolves status when well configured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'livekit',
        COMMS_ROOM_PREFIX: 'world-',
        LIVEKIT_HOST: 'livekit.dcl.org',
        LIVEKIT_API_KEY: 'myApiKey',
        LIVEKIT_API_SECRET: 'myApiSecret'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> =>
          new Response(
            JSON.stringify({
              rooms: [
                {
                  name: 'world-prd-mariano.dcl.eth',
                  num_participants: 2
                }
              ]
            })
          )
      }

      const commsAdapter = await createCommsAdapterComponent({ config, fetch, logs })

      const adapter = await commsAdapter.status()
      expect(adapter).toMatchObject({
        rooms: 1,
        users: 2,
        details: [
          {
            users: 2,
            worldName: 'prd-mariano.dcl.eth'
          }
        ]
      })
    })

    it('refuses to initialize when misconfigured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'livekit',
        COMMS_ROOM_PREFIX: 'world-'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => new Response(undefined)
      }

      await expect(createCommsAdapterComponent({ config, fetch, logs })).rejects.toThrow(
        'Configuration: string LIVEKIT_HOST is required'
      )
    })

    it('survives failure to retrieve comms status', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'livekit',
        COMMS_ROOM_PREFIX: 'world-',
        LIVEKIT_HOST: 'livekit.dcl.org',
        LIVEKIT_API_KEY: 'myApiKey',
        LIVEKIT_API_SECRET: 'myApiSecret'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => {
          throw Error('Failed to fetch comms status')
        }
      }
      const commsAdapter = await createCommsAdapterComponent({ config, fetch, logs })

      await expect(commsAdapter.status()).resolves.toBeUndefined()
    })
  })

  describe('invalid adapter', function () {
    it('refuses to initialize when misconfigured', async () => {
      const config: IConfigComponent = await createConfigComponent({
        COMMS_ADAPTER: 'other',
        COMMS_ROOM_PREFIX: 'world-'
      })
      const logs = await createLogComponent({ config })

      const fetch: IFetchComponent = {
        fetch: async (_url: Request): Promise<Response> => new Response(undefined)
      }

      await expect(createCommsAdapterComponent({ config, fetch, logs })).rejects.toThrow('Invalid comms adapter: other')
    })
  })
})
