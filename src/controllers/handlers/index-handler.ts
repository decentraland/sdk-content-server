import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function getIndexHandler(
  context: HandlerContextWithPath<'config' | 'worldsIndexer', '/index'>
): Promise<IHttpServerComponent.IResponse> {
  const { config, worldsIndexer } = context.components

  const baseUrl = (await config.getString('HTTP_BASE_URL')) || `${context.url.protocol}//${context.url.host}`

  const indexData = await worldsIndexer.getIndex()

  // Transform to URLs
  for (const worldData of indexData.index) {
    for (const scene of worldData.scenes) {
      if (scene.thumbnail) {
        scene.thumbnail = `${baseUrl}/contents/${scene.thumbnail}`
      }
    }
  }

  return {
    status: 200,
    body: { data: indexData.index, lastUpdated: new Date(indexData.timestamp).toISOString() }
  }
}
