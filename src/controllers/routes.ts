import { Router } from '@well-known-components/http-server'
import { multipartParserWrapper } from '../logic/multipart'
import { GlobalContext } from '../types'
import { aboutHandler } from './handlers/aboutHandler'
import { availableContentHandler, getContentFile, headContentFile } from './handlers/contentFileHandler'
import { deployEntity } from './handlers/deployEntityHandler'
import { dclNameAboutHandler } from './handlers/dclNameAboutHandler'
import { statsHandler } from './handlers/statsHandler'
import { createAuthMiddleware } from './handlers/auth-middleware'
import { statusHandler } from './handlers/statusHandler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/about', aboutHandler)
  router.get('/world/:world_name/about', dclNameAboutHandler)

  // creation
  router.post('/entities', multipartParserWrapper(deployEntity))
  router.get('/available-content', availableContentHandler)

  // consumption
  router.head('/ipfs/:hashId', headContentFile)
  router.get('/ipfs/:hashId', getContentFile)

  // legacy?
  router.head('/contents/:hashId', headContentFile)
  router.get('/contents/:hashId', getContentFile)

  router.get('/status', statusHandler)
  router.get('/stats', await createAuthMiddleware(globalContext.components), statsHandler)

  return router
}
