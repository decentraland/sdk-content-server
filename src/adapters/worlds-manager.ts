import { AppComponents, IWorldsManager } from '../types'
import LRU from 'lru-cache'

export async function createWorldsManagerComponent({
  storage,
  logs
}: Pick<AppComponents, 'storage' | 'logs'>): Promise<IWorldsManager> {
  const logger = logs.getLogger('worlds-manager')
  const WORLDS_KEY = 'worlds'
  const cache = new LRU<any, string[]>({
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

  return {
    getDeployedWorldsNames,
    getDeployedWorldsCount
  }
}
