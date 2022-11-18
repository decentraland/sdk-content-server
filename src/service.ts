import { Lifecycle } from "@well-known-components/interfaces"
import { setupRouter } from "./controllers/routes"
import { AppComponents, GlobalContext, TestComponents } from "./types"

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>) {
  const { components, startComponents } = program
  const globalContext: GlobalContext = {
    components,
  }

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(globalContext)
  // register routes middleware
  components.server.use(router.middleware())
  // register not implemented/method not allowed/cors responses middleware
  components.server.use(router.allowedMethods())
  // set the context to be passed to the handlers
  components.server.setContext(globalContext)

  // start ports: db, listeners, synchronizations, etc
  await startComponents()

  // Migrate old name pointers to new one
  for await (const key of await components.storage.allFileIds()) {
    if (!key.startsWith('name-') && key.endsWith('.dcl.eth')) {
      console.log(`Renaming "${key}" to "name-${key}"`)
      const fileContent = await components.storage.retrieve(key)
      await components.storage.storeStream(`name-${key}`, await fileContent?.asStream()!)
      await components.storage.delete([key])
    }
  }
}
