import { test } from '../components'
import { Authenticator } from '@dcl/crypto'
import { getAuthHeaders, getIdentity, storeJson } from '../utils'

test('comms adapter handler /get-comms-adapter/:roomId', function ({ components }) {
  it('works when signed-fetch request is correct', async () => {
    const { localFetch, storage } = components

    const identity = await getIdentity()

    await storeJson(storage, 'name-myRoom', '')

    const path = '/get-comms-adapter/world-myRoom'
    const actualInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(
          'post',
          path,
          {
            origin: 'https://play.decentraland.org',
            intent: 'dcl:explorer:comms-handshake',
            signer: 'dcl:explorer',
            isGuest: 'false'
          },
          (payload) =>
            Authenticator.signPayload(
              {
                ephemeralIdentity: identity.ephemeralIdentity,
                expiration: new Date(),
                authChain: identity.authChain.authChain
              },
              payload
            )
        )
      }
    }

    const r = await localFetch.fetch(path, actualInit)

    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      fixedAdapter: 'ws-room:ws-room-service.decentraland.org/rooms/world-myRoom'
    })
  })
})

test('comms adapter handler /get-comms-adapter/:roomId', function ({ components }) {
  it('fails when signed-fetch request metadata is correct but room id does not exist', async () => {
    const { localFetch } = components

    const identity = await getIdentity()

    const path = '/get-comms-adapter/world-myRoom'
    const actualInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(
          'post',
          path,
          {
            origin: 'https://play.decentraland.org',
            intent: 'dcl:explorer:comms-handshake',
            signer: 'dcl:explorer',
            isGuest: 'false'
          },
          (payload) =>
            Authenticator.signPayload(
              {
                ephemeralIdentity: identity.ephemeralIdentity,
                expiration: new Date(),
                authChain: identity.authChain.authChain
              },
              payload
            )
        )
      }
    }

    const r = await localFetch.fetch(path, actualInit)

    expect(r.status).toEqual(404)
    expect(await r.json()).toEqual({ message: 'World "myRoom" does not exist.' })
  })
})

test('comms adapter handler /get-comms-adapter/:roomId', function ({ components }) {
  it('fails when signed-fetch request metadata is correct but room id is invalid', async () => {
    const { localFetch } = components

    const identity = await getIdentity()

    const path = '/get-comms-adapter/myRoom'
    const actualInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(
          'post',
          path,
          {
            origin: 'https://play.decentraland.org',
            intent: 'dcl:explorer:comms-handshake',
            signer: 'dcl:explorer',
            isGuest: 'false'
          },
          (payload) =>
            Authenticator.signPayload(
              {
                ephemeralIdentity: identity.ephemeralIdentity,
                expiration: new Date(),
                authChain: identity.authChain.authChain
              },
              payload
            )
        )
      }
    }

    const r = await localFetch.fetch(path, actualInit)

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({ message: 'Invalid room id requested.' })
  })
})

test('comms adapter handler /get-comms-adapter/:roomId', function ({ components }) {
  it('fails when signed-fetch request metadata is incorrect', async () => {
    const { localFetch } = components

    const identity = await getIdentity()

    const path = '/get-comms-adapter/myRoom'
    const actualInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(
          'post',
          path,
          {
            origin: 'https://play.decentraland.org'
          },
          (payload) =>
            Authenticator.signPayload(
              {
                ephemeralIdentity: identity.ephemeralIdentity,
                expiration: new Date(),
                authChain: identity.authChain.authChain
              },
              payload
            )
        )
      }
    }

    const r = await localFetch.fetch(path, actualInit)

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: 'Access denied, invalid metadata'
    })
  })
})

test('comms adapter handler /get-comms-adapter/:roomId', function ({ components }) {
  it('fails when request is not a signed-fetch one', async () => {
    const { localFetch } = components

    const r = await localFetch.fetch('/get-comms-adapter/roomId', {
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: 'Invalid Auth Chain',
      ok: false
    })
  })
})
