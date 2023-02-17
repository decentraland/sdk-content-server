import { test } from '../components'
import { storeJson } from '../utils'

const STORED_ENTITY = { metadata: {} }
const ENTITY_CID = 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'
const ENS = 'some-name.dcl.eth'

test('active entities handler /entities/active', function ({ components }) {
  it('when world is not yet deployed it responds [] in active entities', async () => {
    const { localFetch } = components
    const r = await localFetch.fetch('/entities/active', {
      method: 'POST',
      body: JSON.stringify({ pointers: [ENS] }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual([])
  })
})

test('active entities handler /entities/active', function ({ components }) {
  it('when wrong input responds with error 400', async () => {
    const { localFetch } = components
    const r = await localFetch.fetch('/entities/active', {
      method: 'POST',
      body: JSON.stringify([]),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    expect(r.status).toEqual(400)
    expect(await r.json()).toMatchObject({ message: 'Invalid request. Request body is not valid' })
  })
})

test('world about handler /world/:world_name/about', function ({ components }) {
  it('when world is deployed it responds [<Entity>] in active entities endpoint', async () => {
    const { localFetch, storage } = components

    await storeJson(storage, ENTITY_CID, STORED_ENTITY)
    await storeJson(storage, `name-${ENS}`, {
      entityId: ENTITY_CID
    })
    const r = await localFetch.fetch('/entities/active', {
      method: 'POST',
      body: JSON.stringify({ pointers: [ENS] }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual([
      {
        ...STORED_ENTITY,
        timestamp: 0, // we don't store the deployment timestamp yet
        id: ENTITY_CID
      }
    ])
  })
})
