import { test } from '../components'
import { getIdentity, storeJson } from '../utils'
import { Authenticator } from '@dcl/crypto'

const STORED_ENTITY = { metadata: {} }
const ENTITY_CID = 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
const ENS = 'some-name.dcl.eth'

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world is not yet deployed it responds 404', async () => {
    const { localFetch } = components
    const r = await localFetch.fetch(`/world/${ENS}/about`)
    expect(r.status).toEqual(404)
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world is not yet deployed but ACL exists it responds 404', async () => {
    const { localFetch, storage } = components

    const delegatedIdentity = await getIdentity()
    const ownerIdentity = await getIdentity()

    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"]}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      acl: Authenticator.signPayload(ownerIdentity.authChain, payload)
    })

    const r = await localFetch.fetch(`/world/${ENS}/about`)
    expect(r.status).toEqual(404)
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists it responds', async () => {
    const { localFetch, storage } = components

    await storeJson(storage, ENTITY_CID, STORED_ENTITY)
    await storeJson(storage, `name-${ENS}`, {
      entityId: ENTITY_CID
    })

    const r = await localFetch.fetch(`/world/${ENS}/about`)
    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      healthy: true,
      acceptingUsers: true,
      configurations: {
        networkId: 5,
        globalScenesUrn: [],
        scenesUrn: [`urn:decentraland:entity:${ENTITY_CID}?=&baseUrl=https://0.0.0.0:3000/contents/`],
        minimap: { enabled: false },
        skybox: {},
        realmName: ENS
      },
      content: { healthy: true, publicUrl: 'https://peer.com/content' },
      lambdas: { healthy: true, publicUrl: 'https://peer.com/lambdas' },
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter: `signed-login:https://0.0.0.0:3000/get-comms-adapter/world-${ENS}`
      }
    })
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists and has minimap it responds', async () => {
    const { localFetch, storage } = components

    await storeJson(storage, 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
      metadata: {
        worldConfiguration: {
          minimapVisible: true
        }
      }
    })
    await storeJson(storage, 'name-some-name.dcl.eth', {
      entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
    })

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject({
      configurations: {
        minimap: {
          enabled: true,
          dataImage: 'https://api.decentraland.org/v1/minimap.png',
          estateImage: 'https://api.decentraland.org/v1/estatemap.png'
        }
      }
    })
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world exists and uses offline comms', async () => {
    const { localFetch, storage } = components

    await storeJson(storage, 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y', {
      metadata: {
        worldConfiguration: {
          fixedAdapter: 'offline:offline'
        }
      }
    })
    await storeJson(storage, 'name-some-name.dcl.eth', {
      entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
    })

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject({
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter: 'offline:offline'
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

    await storeJson(storage, 'name-some-name.dcl.eth', {
      entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
    })

    const r = await localFetch.fetch('/world/some-name.dcl.eth/about')
    expect(r.status).toEqual(404)
    expect(await r.text()).toEqual(
      'Scene "bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y" not deployed in this server.'
    )
  })
})
