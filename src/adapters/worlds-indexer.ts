import { AppComponents, IWorldsIndexer, WorldData, WorldsIndex } from '../types'
import { bufferToStream, streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'
import { stringToUtf8Bytes } from 'eth-connect'
import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'

const GLOBAL_INDEX_FILE = 'global-index.json'

export async function createWorldsIndexerComponent({
  logs,
  storage,
  worldsManager
}: Pick<AppComponents, 'logs' | 'storage' | 'worldsManager'>): Promise<IWorldsIndexer> {
  const logger = logs.getLogger('worlds-indexer')

  async function createIndex(): Promise<WorldsIndex> {
    logger.info('Creating index of all the data from all the worlds deployed in the server')
    const deployedWorldsNames = await worldsManager.getDeployedWorldsNames()
    const index: WorldData[] = []

    for (const worldName of deployedWorldsNames) {
      const entity = await worldsManager.getEntityForWorld(worldName)
      if (!entity) {
        continue
      }
      const thumbnailFile = entity.content.find(
        (content: ContentMapping) => content.file === entity.metadata?.display?.navmapThumbnail
      )
      index.push({
        name: worldName,
        scenes: [
          {
            id: entity.id,
            title: entity.metadata?.display?.title,
            description: entity.metadata?.display?.description,
            thumbnail: thumbnailFile!.hash,
            pointers: entity.pointers,
            runtimeVersion: entity.metadata?.runtimeVersion,
            timestamp: entity.timestamp
          }
        ]
      })
    }

    const indexData: WorldsIndex = { index, timestamp: Date.now() }
    await storage.storeStream(GLOBAL_INDEX_FILE, bufferToStream(stringToUtf8Bytes(JSON.stringify(indexData))))
    logger.info('Done indexing')

    return indexData
  }

  async function getIndex(): Promise<WorldsIndex> {
    let content
    try {
      content = await storage.retrieve(GLOBAL_INDEX_FILE)
    } catch (e: any) {
      logger.warn(`Error retrieving index file: ${e.message}`)
    }

    let index: WorldsIndex

    if (!content) {
      index = await createIndex()
    } else {
      index = JSON.parse((await streamToBuffer(await content.asStream())).toString())
      // if older than 10 minutes create a new one
      if (Date.now() - index.timestamp > 10 * 60 * 1000) {
        index = await createIndex()
      }
    }

    return index
  }

  return {
    getIndex
  }
}
