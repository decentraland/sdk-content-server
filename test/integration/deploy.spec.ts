import { test } from '../components'
import { ContentClient } from 'dcl-catalyst-client'
import { EntityType } from '@dcl/schemas'
import { Authenticator } from '@dcl/crypto'
import Sinon from 'sinon'
import { stringToUtf8Bytes } from 'eth-connect'
import { hashV1 } from '@dcl/hashing'
import { getIdentity } from '../utils'

test('deployment works', function ({ components, stubComponents }) {
  it('creates an entity and deploys it', async () => {
    const { config, storage } = components
    const { namePermissionChecker, metrics } = stubComponents

    const contentClient = new ContentClient({
      contentUrl: `http://${await config.requireString('HTTP_SERVER_HOST')}:${await config.requireNumber(
        'HTTP_SERVER_PORT'
      )}`
    })

    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set('abc.txt', stringToUtf8Bytes('asd'))
    const fileHash = await hashV1(entityFiles.get('abc.txt'))

    expect(await storage.exist(fileHash)).toEqual(false)

    // Build the entity
    const { files, entityId } = await contentClient.buildEntity({
      type: EntityType.SCENE,
      pointers: ['0,0'],
      files: entityFiles,
      metadata: {
        worldConfiguration: {
          name: 'my-super-name.dcl.eth'
        }
      }
    })

    // Sign entity id
    const identity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-super-name.dcl.eth')
      .resolves(true)

    const authChain = Authenticator.signPayload(identity.authChain, entityId)

    // Deploy entity
    await contentClient.deployEntity({ files, entityId, authChain })

    Sinon.assert.calledWith(
      namePermissionChecker.checkPermission,
      identity.authChain.authChain[0].payload,
      'my-super-name.dcl.eth'
    )

    expect(await storage.exist(fileHash)).toEqual(true)
    expect(await storage.exist(entityId)).toEqual(true)

    Sinon.assert.calledWithMatch(metrics.increment, 'world_deployments_counter')
  })
})

test('deployment with failed validation', function ({ components, stubComponents }) {
  it('does not work because user does not own requested name', async () => {
    const { config, storage } = components
    const { namePermissionChecker, metrics } = stubComponents

    const contentClient = new ContentClient({
      contentUrl: `http://${await config.requireString('HTTP_SERVER_HOST')}:${await config.requireNumber(
        'HTTP_SERVER_PORT'
      )}`
    })

    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set('abc.txt', stringToUtf8Bytes('asd'))
    const fileHash = await hashV1(entityFiles.get('abc.txt'))

    expect(await storage.exist(fileHash)).toEqual(false)

    // Build the entity
    const { files, entityId } = await contentClient.buildEntity({
      type: EntityType.SCENE,
      pointers: ['0,0'],
      files: entityFiles,
      metadata: {
        worldConfiguration: {
          name: 'just-do-it.dcl.eth'
        }
      }
    })

    // Sign entity id
    const identity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'just-do-it.dcl.eth')
      .resolves(false)

    const authChain = Authenticator.signPayload(identity.authChain, entityId)

    // Deploy entity
    await expect(() => contentClient.deployEntity({ files, entityId, authChain })).rejects.toThrow(
      'Your wallet has no permission to publish this scene because it does not have permission to deploy under "just-do-it.dcl.eth". Check scene.json to select a name you own.'
    )

    Sinon.assert.calledWith(
      namePermissionChecker.checkPermission,
      identity.authChain.authChain[0].payload,
      'just-do-it.dcl.eth'
    )

    expect(await storage.exist(fileHash)).toEqual(false)
    expect(await storage.exist(entityId)).toEqual(false)

    Sinon.assert.notCalled(metrics.increment)
  })
})

test('deployment with failed validation', function ({ components, stubComponents }) {
  it('does not work because user did not specify any names', async () => {
    const { config, storage } = components
    const { namePermissionChecker, metrics } = stubComponents

    const contentClient = new ContentClient({
      contentUrl: `http://${await config.requireString('HTTP_SERVER_HOST')}:${await config.requireNumber(
        'HTTP_SERVER_PORT'
      )}`
    })

    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set('abc.txt', stringToUtf8Bytes('asd'))
    const fileHash = await hashV1(entityFiles.get('abc.txt'))

    expect(await storage.exist(fileHash)).toEqual(false)

    // Build the entity
    const { files, entityId } = await contentClient.buildEntity({
      type: EntityType.SCENE,
      pointers: ['0,0'],
      files: entityFiles,
      metadata: {}
    })

    // Sign entity id
    const identity = await getIdentity()

    namePermissionChecker.checkPermission
      .withArgs(identity.authChain.authChain[0].payload, 'my-super-name.dcl.eth')
      .resolves(false)

    const authChain = Authenticator.signPayload(identity.authChain, entityId)

    // Deploy entity
    await expect(() => contentClient.deployEntity({ files, entityId, authChain })).rejects.toThrow(
      'Deployment failed: scene.json needs to specify a worldConfiguration section with a valid name inside.'
    )

    Sinon.assert.notCalled(namePermissionChecker.checkPermission)

    expect(await storage.exist(fileHash)).toEqual(false)
    expect(await storage.exist(entityId)).toEqual(false)

    Sinon.assert.notCalled(metrics.increment)
  })
})
