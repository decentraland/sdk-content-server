import { test } from '../components'
import { getIdentity, storeJson } from '../utils'
import { Authenticator } from '@dcl/crypto'
import { streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'

test('acl handler GET /acl/:world_name', function ({ components }) {
  it('returns an error when world does not exist', async () => {
    const { localFetch } = components

    const r = await localFetch.fetch('/acl/my-world.dcl.eth')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [],
      timestamp: ''
    })
  })
})

test('acl handler GET /acl/:world_name', function ({ components }) {
  it('returns an empty list of allowed when no acl exists', async () => {
    const { localFetch, storage } = components

    await storeJson(
      storage,
      'name-my-world.dcl.eth',
      '{"entityId":"bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq"}'
    )

    const r = await localFetch.fetch('/acl/my-world.dcl.eth')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [],
      timestamp: ''
    })
  })
})

test('acl handler GET /acl/:world_name', function ({ components }) {
  it('returns an empty list of allowed when existing acl is no longer the world owner', async () => {
    const { localFetch, storage } = components

    const delegatedIdentity = await getIdentity()
    const ownerIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq',
      acl: Authenticator.signPayload(ownerIdentity.authChain, payload)
    })

    const r = await localFetch.fetch('/acl/my-world.dcl.eth')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [],
      timestamp: ''
    })
  })
})

test('acl handler GET /acl/:world_name', function ({ components, stubComponents }) {
  it('returns acl from auth-chain when acl exists', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const delegatedIdentity = await getIdentity()
    const ownerIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq',
      acl: Authenticator.signPayload(ownerIdentity.authChain, payload)
    })

    namePermissionChecker.checkPermission
      .withArgs(ownerIdentity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [delegatedIdentity.realAccount.address],
      timestamp: ts
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('works when all is correct', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    const signature = Authenticator.createSignature(identity.realAccount, payload)
    const acl = Authenticator.createSimpleAuthChain(payload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [delegatedIdentity.realAccount.address],
      timestamp: ts
    })

    const content = await storage.retrieve('name-my-world.dcl.eth')
    const stored = JSON.parse((await streamToBuffer(await content.asStream())).toString())
    expect(stored).toMatchObject({
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq',
      acl
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when resource is different than requested world', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"another-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const acl = Authenticator.signPayload(identity.authChain, payload)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message:
        'Provided acl is for world "another-world.dcl.eth" but you are trying to set acl for world my-world.dcl.eth.'
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when name owner is part of the ACL', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${identity.realAccount.address}"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const acl = Authenticator.signPayload(identity.authChain, payload)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message:
        'You are trying to give permission to yourself. You own "my-world.dcl.eth", so you already have permission to deploy scenes, no need to include yourself in the ACL.'
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when invalid acl (acl is not array)', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":{"something":"${delegatedIdentity.realAccount.address}"},"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const acl = Authenticator.signPayload(identity.authChain, payload)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Provided acl is invalid. allowed is missing or not an array of addresses.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when invalid acl (non address)', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["invalid"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const acl = Authenticator.signPayload(identity.authChain, payload)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Provided acl is invalid. allowed is missing or not an array of addresses.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when signer wallet does not own world name', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(false)

    const acl = Authenticator.signPayload(identity.authChain, payload)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(403)
    expect(await r.json()).toEqual({
      message: `Your wallet does not own "my-world.dcl.eth", you can not set access control lists for it.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails invalid payload sent', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq'
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(false)

    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify({}),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Invalid payload received. Need to be a valid AuthChain.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when missing timestamp', async () => {
    const { localFetch } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"]}`

    const signature = Authenticator.createSignature(identity.realAccount, payload)
    const acl = Authenticator.createSimpleAuthChain(payload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Invalid ACL, timestamp is missing or has an invalid date.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when timestamp is too old', async () => {
    const { localFetch } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const ts = new Date(Date.now() - 500_000).toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    const signature = Authenticator.createSignature(identity.realAccount, payload)
    const acl = Authenticator.createSimpleAuthChain(payload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Timestamp is not recent. Please sign a new ACL change request.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when timestamp is too far in the future', async () => {
    const { localFetch } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const ts = new Date(Date.now() + 500_000).toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    const signature = Authenticator.createSignature(identity.realAccount, payload)
    const acl = Authenticator.createSimpleAuthChain(payload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: `Timestamp is not recent. Please sign a new ACL change request.`
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when new timestamp is after currently stored ACL', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    await storeJson(storage, 'name-my-world.dcl.eth', {
      entityId: 'bafkreiax5plaxze77tnjbnozga7dsbefdh53horza4adf2xjzxo3k5i4xq',
      acl: Authenticator.signPayload(identity.authChain, payload)
    })

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const newTs = new Date(Date.parse(ts) - 1).toISOString()
    const newPayload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${newTs}"}`

    const signature = Authenticator.createSignature(identity.realAccount, newPayload)
    const acl = Authenticator.createSimpleAuthChain(newPayload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(400)
    expect(await r.json()).toEqual({
      message: 'There is a newer ACL stored. Please sign a new ACL change request.'
    })
  })
})

test('acl handler POST /acl/:world_name', function ({ components, stubComponents }) {
  it('fails when the world name does not exist', async () => {
    const { localFetch, storage } = components
    const { namePermissionChecker } = stubComponents

    const identity = await getIdentity()
    const delegatedIdentity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-world.dcl.eth')
      .resolves(true)

    const ts = new Date().toISOString()
    const payload = `{"resource":"my-world.dcl.eth","allowed":["${delegatedIdentity.realAccount.address}"],"timestamp":"${ts}"}`

    const signature = Authenticator.createSignature(identity.realAccount, payload)
    const acl = Authenticator.createSimpleAuthChain(payload, identity.realAccount.address, signature)
    const r = await localFetch.fetch('/acl/my-world.dcl.eth', {
      body: JSON.stringify(acl),
      method: 'POST'
    })

    expect(r.status).toEqual(200)
    expect(await r.json()).toEqual({
      resource: 'my-world.dcl.eth',
      allowed: [delegatedIdentity.realAccount.address],
      timestamp: ts
    })

    const content = await storage.retrieve('name-my-world.dcl.eth')
    const stored = JSON.parse((await streamToBuffer(await content.asStream())).toString())
    expect(stored).toEqual({
      acl
    })
  })
})
