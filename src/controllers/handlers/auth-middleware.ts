import { AppComponents, GlobalContext } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { RoutedContext } from '@well-known-components/http-server'

export async function createAuthMiddleware(
  components: Pick<AppComponents, 'config' | 'logs'>
): Promise<IHttpServerComponent.IRequestHandler<RoutedContext<GlobalContext, '/stats'>>> {
  const logger = components.logs.getLogger('auth-middleware')

  const secret = await components.config.getString('AUTH_SECRET')
  if (!secret) {
    logger.warn('No secret defined, no access token will be required for protected endpoints.')
  }

  const notAllowedResponse = (errorMessage: string) => {
    logger.debug(errorMessage)
    return {
      status: 403,
      statusText: 'Not allowed',
      body: {
        message: errorMessage
      }
    }
  }

  return async function (
    context: IHttpServerComponent.DefaultContext,
    next: () => Promise<IHttpServerComponent.IResponse>
  ): Promise<IHttpServerComponent.IResponse> {
    if (secret) {
      const token = context.request.headers.get('Authorization')?.substring(7) // Remove the "Bearer " part
      if (!token) {
        return notAllowedResponse('Not allowed. Missing access token.')
      }
      if (token !== secret) return notAllowedResponse(`Not allowed. Invalid API key.`)
    }

    return next()
  }
}
