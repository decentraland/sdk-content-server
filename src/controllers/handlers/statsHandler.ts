import { HandlerContextWithPath } from '../../types'

export async function statsHandler({
  components: { storage }
}: Pick<HandlerContextWithPath<'config' | 'storage', '/stats'>, 'components' | 'params' | 'url'>) {
  const filtered = []
  for await (const key of await storage.allFileIds('name-')) {
    filtered.push(key.substring(5)) // remove "name-" prefix
  }

  return {
    status: 200,
    body: {
      deployed_names: filtered
    }
  }
}
