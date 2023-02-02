import { test } from '../components'
import { storeJson } from '../utils'

test('consume content endpoints', function ({ components }) {
  it('responds /contents/:cid and works', async () => {
    const { localFetch, storage } = components

    {
      const r = await localFetch.fetch('/contents/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y')
      expect(r.status).toEqual(404)
    }

    await storeJson(storage, 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', 'Hola')

    {
      const r = await localFetch.fetch('/contents/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y')
      expect(r.status).toEqual(200)
      expect(await r.text()).toEqual('"Hola"')
    }
  })
})

test('consume content endpoints', function ({ components }) {
  it('responds HEAD /contents/:cid and works', async () => {
    const { localFetch, storage } = components

    {
      const r = await localFetch.fetch('/contents/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
        method: 'HEAD'
      })
      expect(r.status).toEqual(404)
    }

    await storeJson(storage, 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', 'Hola')
    {
      const r = await localFetch.fetch('/contents/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
        method: 'HEAD'
      })
      expect(r.status).toEqual(200)
      expect(await r.text()).toEqual('')
    }
  })
})

test('consume status endpoint', function ({ components }) {
  it('responds /status works', async () => {
    const { localFetch, storage } = components

    await storeJson(storage, 'name-some-name.dcl.eth', {
      entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
    })

    {
      // Without authentication deployedWorlds is not retrieved
      const r = await localFetch.fetch('/status')

      expect(r.status).toEqual(200)
      expect(await r.json()).toMatchObject({
        content: {
          commitHash: 'unknown',
          worldsCount: 1
        },
        comms: {
          rooms: 1,
          users: 2
        }
      })
    }

    {
      // With authentication deployedWorlds is retrieved
      const r = await localFetch.fetch('/status', {
        headers: {
          Authorization: 'Bearer changeme'
        }
      })

      expect(r.status).toEqual(200)
      expect(await r.json()).toMatchObject({
        content: {
          commitHash: 'unknown',
          worldsCount: 1,
          details: ['some-name.dcl.eth']
        },
        comms: {
          rooms: 1,
          users: 2,
          details: [
            {
              worldName: 'mariano.dcl.eth',
              users: 2
            }
          ]
        }
      })
    }
  })
})

test('consume about endpoint', function ({ components }) {
  it('responds /about works', async () => {
    const { localFetch } = components

    const r = await localFetch.fetch('/about')
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject({
      healthy: true,
      acceptingUsers: true,
      configurations: {
        networkId: 5,
        globalScenesUrn: [],
        scenesUrn: [''],
        minimap: { enabled: true },
        skybox: {}
      },
      content: { healthy: true, publicUrl: 'https://peer.com/content' },
      lambdas: { healthy: true, publicUrl: 'https://peer.com/lambdas' },
      comms: {
        fixedAdapter: 'ws-room:ws-room-service.decentraland.org/rooms/test-scene',
        healthy: true,
        protocol: 'v3'
      }
    })
  })
})
