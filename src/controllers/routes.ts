import { Router } from '@well-known-components/http-server'
import { multipartParserWrapper } from '../logic/multipart'
import { GlobalContext } from '../types'
import { aboutHandler } from './handlers/aboutHandler'
import { availableContentHandler, getContentFile, headContentFile } from './handlers/contentFileHandler'
import { deployEntity } from './handlers/deployEntityHandler'
import { worldAboutHandler } from './handlers/world-about-handler'
import { statusHandler } from './handlers/statusHandler'
import { commsAdapterHandler } from './handlers/commsAdapterHandler'
import { wellKnownComponents } from 'decentraland-crypto-middleware'
import { activeEntitiesHandler } from './handlers/activeEntities'
import { getAclHandler, postAclHandler } from './handlers/acl-handlers'

export async function setupRouter(_globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/about', aboutHandler)
  router.get('/world/:world_name/about', worldAboutHandler)

  // creation
  router.post('/entities', multipartParserWrapper(deployEntity))
  router.get('/available-content', availableContentHandler)

  // consumption
  router.head('/ipfs/:hashId', headContentFile)
  router.get('/ipfs/:hashId', getContentFile)

  router.post('/entities/active', activeEntitiesHandler)
  router.head('/contents/:hashId', headContentFile)
  router.get('/contents/:hashId', getContentFile)

  router.get('/acl/:world_name', getAclHandler)
  router.post('/acl/:world_name', postAclHandler)

  router.get('/status', statusHandler)

  router.use('/get-comms-adapter/:roomId', wellKnownComponents({}))
  router.post('/get-comms-adapter/:roomId', commsAdapterHandler)
  return router
}
