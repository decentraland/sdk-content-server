import { test } from '../components'
import { stringToUtf8Bytes } from 'eth-connect'

test('consume content endpoints', function ({ components }) {
  it('responds /ipfs/:cid and works', async () => {
    const { localFetch, storage } = components

    {
      const r = await localFetch.fetch('/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y')
      expect(r.status).toEqual(404)
    }

    storage.storage.set('bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', stringToUtf8Bytes('Hola'))

    {
      const r = await localFetch.fetch('/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y')
      expect(r.status).toEqual(200)
      expect(await r.text()).toEqual('Hola')
    }
  })
})

test('consume content endpoints', function ({ components }) {
  it('responds HEAD /ipfs/:cid and works', async () => {
    const { localFetch, storage } = components

    {
      const r = await localFetch.fetch('/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
        method: 'HEAD'
      })
      expect(r.status).toEqual(404)
    }

    storage.storage.set('bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', stringToUtf8Bytes('Hola'))

    {
      const r = await localFetch.fetch('/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
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

    storage.storage.set(
      'name-some-name.dcl.eth',
      stringToUtf8Bytes(JSON.stringify({ entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y' }))
    )

    {
      // Without authentication deployedWorlds is not retrieved
      const r = await localFetch.fetch('/status')

      expect(r.status).toEqual(200)
      expect(await r.json()).toEqual({
        commitHash: 'unknown',
        worldsCount: 1
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
      expect(await r.json()).toEqual({
        commitHash: 'unknown',
        worldsCount: 1,
        deployedWorlds: ['some-name.dcl.eth']
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
