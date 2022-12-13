import { test } from '../components'
import { stringToUtf8Bytes } from 'eth-connect'

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists it responds', async () => {
    const { localFetch, storage } = components

    storage.storage.set(
      'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y',
      stringToUtf8Bytes(
        JSON.stringify({
          metadata: {}
        })
      )
    )
    storage.storage.set(
      'name-some-name.dcl.eth',
      stringToUtf8Bytes(JSON.stringify({ entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y' }))
    )

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      healthy: true,
      configurations: {
        networkId: 5,
        globalScenesUrn: [],
        scenesUrn: [
          'urn:decentraland:entity:bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y?baseUrl=https://0.0.0.0:3000/ipfs/'
        ],
        minimap: { enabled: false },
        skybox: {},
        realmName: 'some-name.dcl.eth'
      },
      content: { healthy: true, publicUrl: 'https://peer.decentraland.org/content' },
      lambdas: { healthy: true, publicUrl: 'https://peer.decentraland.org/lambdas' },
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter:
          'ws-room:ws-room-service.decentraland.org/rooms/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
      }
    })
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists and has minimap it responds', async () => {
    const { localFetch, storage } = components

    storage.storage.set(
      'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y',
      stringToUtf8Bytes(
        JSON.stringify({
          metadata: {
            worldConfiguration: {
              minimapVisible: true
            }
          }
        })
      )
    )
    storage.storage.set(
      'name-some-name.dcl.eth',
      stringToUtf8Bytes(JSON.stringify({ entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y' }))
    )

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      healthy: true,
      configurations: {
        networkId: 5,
        globalScenesUrn: [],
        scenesUrn: [
          'urn:decentraland:entity:bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y?baseUrl=https://0.0.0.0:3000/ipfs/'
        ],
        minimap: {
          enabled: true,
          dataImage: 'https://api.decentraland.org/v1/minimap.png',
          estateImage: 'https://api.decentraland.org/v1/estatemap.png'
        },
        skybox: {},
        realmName: 'some-name.dcl.eth'
      },
      content: { healthy: true, publicUrl: 'https://peer.decentraland.org/content' },
      lambdas: { healthy: true, publicUrl: 'https://peer.decentraland.org/lambdas' },
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter:
          'ws-room:ws-room-service.decentraland.org/rooms/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
      }
    })
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world does not exist it responds with 404', async () => {
    const { localFetch } = components

    const r = await localFetch.fetch('/world/missing-world.dcl.eth/about')
    expect(r.status).toEqual(404)
    expect(await r.text()).toEqual('World "missing-world.dcl.eth" has no scene deployed.')
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists but the scene does not, it responds with 404', async () => {
    const { localFetch, storage } = components

    storage.storage.set(
      'name-some-name.dcl.eth',
      stringToUtf8Bytes(JSON.stringify({ entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y' }))
    )

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(404)
    expect(await r.text()).toEqual(
      'Scene "bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y" not deployed in this server.'
    )
  })
})
