import { createConfigComponent } from '@well-known-components/env-config-provider'
import {
  createValidator,
  validateAuthChain,
  validateDclName,
  validateDeploymentTtl,
  validateEntity,
  validateEntityId,
  validateFiles,
  validateSceneDimensions,
  validateSdkVersion,
  validateSignature,
  validateSigner,
  validateSize
} from '../../src/adapters/validator'
import { MockedStorage } from '@dcl/catalyst-storage/dist/MockedStorage'
import { IContentStorageComponent } from '@dcl/catalyst-storage'
import { DeploymentToValidate, IDclNameChecker, ILimitsManager, ValidatorComponents } from '../../src/types'
import { HTTPProvider, stringToUtf8Bytes } from 'eth-connect'
import { EntityType } from '@dcl/schemas'
import { createMockLimitsManagerComponent } from '../mocks/limits-manager-mock'
import { createMockDclNameChecker } from '../mocks/dcl-name-checker-mock'
import { DeploymentBuilder } from 'dcl-catalyst-client'
import { getIdentity } from '../utils'
import { Authenticator, AuthIdentity } from '@dcl/crypto'
import { IConfigComponent } from '@well-known-components/interfaces'
import { hashV0, hashV1 } from '@dcl/hashing'
import { TextDecoder } from 'util'
import { bufferToStream } from '@dcl/catalyst-storage/dist/content-item'

describe('validator', function () {
  let config: IConfigComponent
  let storage: IContentStorageComponent
  let ethereumProvider: HTTPProvider
  let fetch
  let limitsManager: ILimitsManager
  let dclNameChecker: IDclNameChecker
  let identity
  let components: ValidatorComponents

  beforeEach(async () => {
    config = await createConfigComponent({
      DEPLOYMENT_TTL: '10000'
    })
    storage = new MockedStorage()
    fetch = {
      fetch: (_url: string, _params: { body?: any; method?: string; mode?: string; headers?: any }): Promise<any> => {
        return Promise.resolve({})
      }
    }

    ethereumProvider = new HTTPProvider('http://localhost', fetch)
    limitsManager = createMockLimitsManagerComponent()
    dclNameChecker = createMockDclNameChecker(['whatever.dcl.eth'])

    identity = await getIdentity()
    components = {
      config,
      storage,
      limitsManager,
      ethereumProvider,
      dclNameChecker
    }
  })

  it('all validations pass', async () => {
    const validator = await createValidator(components)

    const deployment = await createDeployment(identity.authChain)

    const result = await validator.validate(deployment)
    expect(result.ok()).toBeTruthy()
    expect(result.errors).toEqual([])
  })

  it('validateEntity with invalid entity', async () => {
    const deployment = await createDeployment(identity.authChain)

    // make the entity invalid
    delete deployment.entity.type

    const result = await validateEntity.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain("must have required property 'type'")
  })

  it('validateEntityId with entity id', async () => {
    const deployment = await createDeployment(identity.authChain)

    // make the entity id invalid
    deployment.entity.id = 'bafkreie3yaomoex7orli7fumfwgk5abgels5o5fiauxfijzlzoiymqppdi'

    const result = await validateEntityId.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors[0]).toContain(`Invalid entity hash: expected `)
    expect(result.errors[0]).toContain(`but got bafkreie3yaomoex7orli7fumfwgk5abgels5o5fiauxfijzlzoiymqppdi`)
  })

  it('validateDeploymentTtl with invalid deployment ttl', async () => {
    const deployment = await createDeployment(identity.authChain, {
      type: EntityType.SCENE,
      pointers: ['0,0'],
      timestamp: Date.parse('2022-11-01T00:00:00Z'),
      metadata: {},
      files: []
    })

    const result = await validateDeploymentTtl.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors[0]).toContain('Deployment was created ')
    expect(result.errors[0]).toContain('secs ago. Max allowed: 10 secs.')
  })

  it('validateAuthChain with invalid authChain', async () => {
    const deployment = await createDeployment(identity.authChain)

    // Alter the authChain to make it fail
    deployment.authChain = []

    const result = await validateAuthChain.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain('must NOT have fewer than 1 items')
  })

  it('validateSigner with invalid signer', async () => {
    const deployment = await createDeployment(identity.authChain)

    // Alter the signature to make it fail
    deployment.authChain[0].payload = 'Invalid'

    const result = await validateSigner.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain('Invalid signer: Invalid')
  })

  it('validateSignature with invalid signature', async () => {
    const deployment = await createDeployment(identity.authChain)

    // Alter the signature to make it fail
    deployment.authChain = Authenticator.signPayload(identity.authChain, 'invalidId')

    const result = await validateSignature.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain(
      `ERROR: Invalid final authority. Expected: ${deployment.entity.id}. Current invalidId.`
    )
  })

  it('validateDclName with no dcl name', async () => {
    const alteredComponents = {
      ...components,
      dclNameChecker: createMockDclNameChecker()
    }
    const deployment = await createDeployment(identity.authChain)

    const result = await validateDclName.validate(alteredComponents, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain(
      "Deployment failed: Your wallet has no permission to publish to this server because it doesn't own a Decentraland NAME."
    )
  })

  it('validateDclName with no ownership of requested dcl name', async () => {
    const deployment = await createDeployment(identity.authChain, {
      type: EntityType.SCENE,
      pointers: ['0,0'],
      timestamp: Date.now(),
      metadata: {
        worldConfiguration: {
          dclName: 'different.dcl.eth'
        }
      },
      files: []
    })

    const result = await validateDclName.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain(
      'Deployment failed: Your wallet has no permission to publish to this server because it doesn\'t own Decentraland NAME "different.dcl.eth". Check scene.json to select a different name.'
    )
  })

  it('validateSceneDimensions with more parcels than allowed', async () => {
    const deployment = await createDeployment(identity.authChain, {
      type: EntityType.SCENE,
      pointers: ['0,0', '0,1', '1,0', '1,1', '1,2'],
      timestamp: Date.now(),
      metadata: {},
      files: []
    })

    const result = await validateSceneDimensions.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain('Max allowed scene dimensions is 4 parcels.')
  })

  it('validateFiles with errors', async () => {
    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set('abc.txt', Buffer.from(stringToUtf8Bytes('asd')))

    const deployment = await createDeployment(identity.authChain)

    // Alter the files to make it fail
    deployment.files.set(await hashV1(Buffer.from('efg')), Buffer.from('efg'))
    deployment.files.set(await hashV0(Buffer.from('igh')), Buffer.from('igh'))
    deployment.entity.content.push({
      file: 'def.txt',
      hash: 'bafkreie3yaomoex7orli7fumfwgk5abgels5o5fiauxfijzlzoiymqppdi'
    })

    const result = await validateFiles.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain('Extra file detected bafkreigu77uot3qljdv2oftqmer2ogd7glvohpolbz3whza6kmzgppmkkm')
    expect(result.errors).toContain(
      'Only CIDv1 are allowed for content files: QmPeE5zaej9HogrHRfS1NejWsTuh4qcFZCc4Q7LMnwdTMK'
    )
    expect(result.errors).toContain(
      "The hashed file doesn't match the provided content: QmPeE5zaej9HogrHRfS1NejWsTuh4qcFZCc4Q7LMnwdTMK"
    )
    expect(result.errors).toContain(
      'The file bafkreie3yaomoex7orli7fumfwgk5abgels5o5fiauxfijzlzoiymqppdi (def.txt) is neither present in the storage or in the provided entity'
    )
  })

  it('validateSize with errors', async () => {
    const fileContent = Buffer.from(
      Array(10 * 1024 * 1024)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 255))
    )
    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set('abc.txt', Buffer.from(stringToUtf8Bytes('asd')))
    entityFiles.set('file-1.txt', fileContent) // Big file to make validation fail

    const deployment = await createDeployment(identity.authChain, {
      type: EntityType.SCENE,
      pointers: ['0,0'],
      timestamp: Date.now(),
      metadata: {},
      files: entityFiles
    })

    // Remove one of the uploaded files and put it directly into storage
    deployment.files.delete(await hashV1(Buffer.from('asd')))
    await storage.storeStream(await hashV1(Buffer.from('asd')), bufferToStream(Buffer.from(stringToUtf8Bytes('asd'))))

    const result = await validateSize.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain(
      'The deployment is too big. The maximum total size allowed is 10 MB for scenes. You can upload up to 10485760 bytes but you tried to upload 10485763.'
    )
  })

  it('validateSdkVersion with errors', async () => {
    const deployment = await createDeployment(identity.authChain, {
      type: EntityType.SCENE,
      pointers: ['0,0'],
      timestamp: Date.now(),
      metadata: {
        runtimeVersion: '6'
      },
      files: []
    })

    const result = await validateSdkVersion.validate(components, deployment)
    expect(result.ok()).toBeFalsy()
    expect(result.errors).toContain(
      'Worlds are only supported on SDK 7. Please upgrade your scene to latest version of SDK.'
    )
  })
})

async function createDeployment(identityAuthChain: AuthIdentity, entity?: any) {
  const entityFiles = new Map<string, Uint8Array>()
  entityFiles.set('abc.txt', Buffer.from(stringToUtf8Bytes('asd')))
  const fileHash = await hashV1(entityFiles.get('abc.txt'))

  const sceneJson = entity || {
    type: EntityType.SCENE,
    pointers: ['0,0'],
    timestamp: Date.now(),
    metadata: { runtimeVersion: '7' },
    files: entityFiles
  }
  const { files, entityId } = await DeploymentBuilder.buildEntity(sceneJson)
  files.set(entityId, Buffer.from(files.get(entityId)))

  const authChain = Authenticator.signPayload(identityAuthChain, entityId)

  const contentHashesInStorage = new Map<string, boolean>()
  contentHashesInStorage.set(fileHash, false)

  const finalEntity = {
    id: entityId,
    ...JSON.parse(new TextDecoder().decode(files.get(entityId)))
  }

  const deployment: DeploymentToValidate = {
    entity: finalEntity,
    files,
    authChain,
    contentHashesInStorage
  }
  return deployment
}
