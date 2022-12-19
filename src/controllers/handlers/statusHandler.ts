import { HandlerContextWithPath } from '../../types'

export async function statusHandler({
  components: { config }
}: Pick<HandlerContextWithPath<'config' | 'storage', '/status'>, 'components' | 'params' | 'url'>) {
  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'
  return {
    status: 200,
    body: {
      commitHash
    }
  }
}
