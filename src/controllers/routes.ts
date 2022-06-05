import { Router } from "@well-known-components/http-server"
import { multipartParserWrapper } from "../logic/multipart"
import { GlobalContext } from "../types"
import { availableContentHandler, getContentFile, headContentFile } from "./handlers/contentFileHandler"
import { deployEntity } from "./handlers/deployEntityHandler"

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  // creation
  router.post('/entities', multipartParserWrapper(deployEntity))
  router.get('/available-content', availableContentHandler)

  // consumption
  router.head('/ipfs/:hashId', headContentFile)
  router.get('/ipfs/:hashId', getContentFile)

  // legacy?
  router.head('/contents/:hashId', headContentFile)
  router.get('/contents/:hashId', getContentFile)

  return router
}
