import { HandlerContextWithPath } from '../../types'

export async function statsHandler({
  components: { storage }
}: Pick<HandlerContextWithPath<'storage', '/stats'>, 'components' | 'params' | 'url'>) {
  const filtered = []
  for await (const key of await storage.allFileIds('name-')) {
    if (key.endsWith('.dcl.eth')) filtered.push(key.substring(5)) // remove "name-" prefix
  }

  return {
    status: 200,
    body: filtered
  }
}
