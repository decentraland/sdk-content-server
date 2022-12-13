import { HandlerContextWithPath } from '../../types'

export async function statsHandler({
  components: { config, storage }
}: Pick<HandlerContextWithPath<'config' | 'storage', '/stats'>, 'components' | 'params' | 'url'>) {
  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'

  const filtered = []
  for await (const key of await storage.allFileIds('name-')) {
    filtered.push(key.substring(5)) // remove "name-" prefix
  }

  return {
    status: 200,
    body: {
      version: commitHash,
      deployed_names: filtered
    }
  }
}
