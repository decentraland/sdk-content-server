import { AppComponents, IWorldsManager } from '../types'
import LRU from 'lru-cache'
import { streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'

export async function createWorldsManagerComponent({
  storage,
  logs
}: Pick<AppComponents, 'storage' | 'logs'>): Promise<IWorldsManager> {
  const logger = logs.getLogger('worlds-manager')
  const WORLDS_KEY = 'worlds'
  const cache = new LRU<string, string[]>({
    max: 1,
    ttl: 10 * 60 * 1000, // cache for 10 minutes
    fetchMethod: async (_, staleValue): Promise<string[]> => {
      try {
        const worlds = []
        for await (const key of await storage.allFileIds('name-')) {
          worlds.push(key.substring(5)) // remove "name-" prefix
        }
        return worlds
      } catch (_: any) {
        logger.warn(`Error retrieving worlds from storage: ${_.message}`)
        return staleValue
      }
    }
  })

  async function getDeployedWorldsNames(): Promise<string[]> {
    return (await cache.fetch(WORLDS_KEY))!
  }

  async function getDeployedWorldsCount(): Promise<number> {
    return (await cache.fetch(WORLDS_KEY))?.length || 0
  }

  async function getEntityIdForWorld(worldName: string): Promise<string | undefined> {
    const content = await storage.retrieve(`name-${worldName.toLowerCase()}`)
    if (!content) {
      return undefined
    }

    const buffer = await streamToBuffer(await content?.asStream())
    const { entityId } = JSON.parse(buffer.toString())

    return entityId
  }

  return {
    getDeployedWorldsNames,
    getDeployedWorldsCount,
    getEntityIdForWorld
  }
}
