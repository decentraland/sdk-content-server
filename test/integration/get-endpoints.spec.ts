import { test } from "../components"
import { stringToUtf8Bytes } from "eth-connect"

test("consume content endpoints", function ({ components, stubComponents }) {
  it("responds /ipfs/:cid and works", async () => {
    const { localFetch, storage } = components

    {
      const r = await localFetch.fetch("/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y")
      expect(r.status).toEqual(404)
    }

    storage.storage.set("bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y", stringToUtf8Bytes("Hola"))

    {
      const r = await localFetch.fetch("/ipfs/bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y")
      expect(r.status).toEqual(200)
      expect(await r.text()).toEqual("Hola")
    }
  })

  it("responds /world/:dcl_name/about and works", async () => {
    const { localFetch, storage, config } = components

    {
      const r = await localFetch.fetch("/world/my-super-name.dcl.eth/about")
      expect(r.status).toEqual(404)
    }

    storage.storage.set("my-super-name.dcl.eth", stringToUtf8Bytes(JSON.stringify({ entityId: 'bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y'})))
    storage.storage.set("bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y", stringToUtf8Bytes(JSON.stringify({
      entityId: "bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y",
      metadata: {}
    })))

    {
      const r = await localFetch.fetch("/world/my-super-name.dcl.eth/about")

      expect(r.status).toEqual(200)

      const actual: any = await r.json()
      expect(actual.healthy).toBeTruthy()
      expect(actual.configurations.scenesUrn[0]).toBe(`urn:decentraland:entity:bafybeictjyqjlkgybfckczpuqlqo7xfhho3jpnep4wesw3ivaeeuqugc2y?baseUrl=http://${await config.requireString("HTTP_SERVER_HOST")}:${await config.requireNumber("HTTP_SERVER_PORT")}/ipfs`)
    }
  })
})
