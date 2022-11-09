import { test } from "../components"
import { ContentClient } from "dcl-catalyst-client"
import { EntityType } from "@dcl/schemas"
import { Authenticator } from "@dcl/crypto"
import { createUnsafeIdentity } from "@dcl/crypto/dist/crypto"
import { Response } from "node-fetch"
import Sinon from "sinon"
import { stringToUtf8Bytes } from "eth-connect"
import { hashV1 } from "@dcl/hashing"

async function getIdentity() {
  const ephemeralIdentity = createUnsafeIdentity()
  const realAccount = createUnsafeIdentity()

  const authChain = await Authenticator.initializeAuthChain(
    realAccount.address,
    ephemeralIdentity,
    10,
    async (message) => {
      return Authenticator.createSignature(realAccount, message)
    }
  )

  return { authChain, realAccount, ephemeralIdentity }
}

test("deployment works", function ({ components, stubComponents }) {
  it("creates an entity and deploys it", async () => {
    const { localFetch, config, storage } = components
    const { fetch } = stubComponents

    const contentClient = new ContentClient({
      contentUrl: `http://${await config.requireString("HTTP_SERVER_HOST")}:${await config.requireNumber(
        "HTTP_SERVER_PORT"
      )}`,
    })

    const entityFiles = new Map<string, Uint8Array>()
    entityFiles.set("abc.txt", stringToUtf8Bytes("asd"))
    const fileHash = await hashV1(entityFiles.get("abc.txt"))

    expect(await storage.exist(fileHash)).toEqual(false)

    // Build the entity
    const { files, entityId } = await contentClient.buildEntity({
      type: EntityType.SCENE,
      pointers: ["0,0"],
      files: entityFiles,
      metadata: {},
    })

    // Sign entity id
    const identity = await getIdentity()

    fetch.fetch.withArgs(await config.requireString("MARKETPLACE_SUBGRAPH_URL")).resolves(
      new Response(JSON.stringify({
            data: {
              names: [
                {
                  name: 'my-super-name'
                }
              ]
            }
          })
      )
    )
    fetch.fetch.withArgs(`${await config.requireString("CONTENT_URL")}/status`).resolves(
        new Response(JSON.stringify({
              synchronizationStatus: {
                synchronizationState: "Syncing"
              }
            }),
            {status: 200, headers: {"Content-Type": "application/json"}})
    )
    fetch.fetch.withArgs(`${await config.requireString("LAMBDAS_URL")}/status`).resolves(
        new Response(JSON.stringify({}),
            {status: 200, headers: {"Content-Type": "application/json"}})
    )

    const authChain = Authenticator.signPayload(identity.authChain, entityId)

    // Deploy entity
    await contentClient.deployEntity({ files, entityId, authChain })

    Sinon.assert.calledOnceWithMatch(fetch.fetch, await config.requireString("MARKETPLACE_SUBGRAPH_URL"))

    expect(await storage.exist(fileHash)).toEqual(true)
    expect(await storage.exist(entityId)).toEqual(true)

    {
      const r = await localFetch.fetch("/world/my-super-name.dcl.eth/about")

      expect(r.status).toEqual(200)

      const actual: any = await r.json()
      expect(actual.healthy).toBeTruthy()
      expect(actual.configurations.scenesUrn[0]).toBe(`urn:decentraland:entity:${entityId}?baseUrl=http://${await config.requireString("HTTP_SERVER_HOST")}:${await config.requireNumber("HTTP_SERVER_PORT")}/ipfs`)
    }
  })
})

test("deployment doesnt work because of random key", function ({ components, stubComponents }) {
  it("fails deployment with ephemeral random key", async () => {
    const { config } = components
    const { fetch } = stubComponents

    const contentClient = new ContentClient({
      contentUrl: `http://${await config.requireString("HTTP_SERVER_HOST")}:${await config.requireNumber(
        "HTTP_SERVER_PORT"
      )}`,
    })

    const entityFiles = new Map()

    // Build the entity
    const { files, entityId } = await contentClient.buildEntity({
      type: EntityType.SCENE,
      pointers: ["0,0"],
      files: entityFiles,
      metadata: {},
    })

    // Sign entity id
    const identity = await getIdentity()

    const authChain = Authenticator.signPayload(identity.authChain, entityId)

    fetch.fetch.withArgs(await config.requireString("MARKETPLACE_SUBGRAPH_URL")).resolves(
        new Response(JSON.stringify({
              data: {
                names: []
              }
            })
        )
    )

    // Deploy entity
    await expect(() => contentClient.deployEntity({ files, entityId, authChain })).rejects.toThrowError(
      "Deployment failed: Your wallet has no permission to publish to this server because it doesn't own a Decentraland NAME."
    )
  })
})
