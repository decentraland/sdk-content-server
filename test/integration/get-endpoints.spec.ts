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
})
