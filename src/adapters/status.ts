import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'

export type ServiceStatus = {
  healthy: boolean
  publicUrl: string
  time: number
}

export type IStatusComponent = IBaseComponent & {
  getLambdasStatus(): Promise<ServiceStatus>
  getContentStatus(): Promise<ServiceStatus>
}

const STATUS_EXPIRATION_TIME_MS = 1000 * 60 * 5 // 5mins

export async function createStatusComponent(
  components: Pick<BaseComponents, 'fetch' | 'logs' | 'config'>
): Promise<IStatusComponent> {
  const { fetch, logs, config } = components

  const logger = logs.getLogger('status-component')
  const lambdasUrl = new URL(await config.requireString('LAMBDAS_URL'))
  const contentUrl = new URL(await config.requireString('CONTENT_URL'))

  const fetchJson = async (baseURL: URL, path: string) => {
    let url = baseURL.toString()
    if (!url.endsWith('/')) {
      url += '/'
    }
    url += path
    const response = await fetch.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    return response.json()
  }

  let lastLambdasStatus: ServiceStatus | undefined = undefined
  async function getLambdasStatus() {
    if (lastLambdasStatus && Date.now() - lastLambdasStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLambdasStatus
    }

    lastLambdasStatus = {
      time: Date.now(),
      healthy: false,
      publicUrl: lambdasUrl.toString()
    }

    try {
      await fetchJson(lambdasUrl, 'status')
      lastLambdasStatus.healthy = true
    } catch (err: any) {
      logger.error(err)
    }

    return lastLambdasStatus
  }

  let lastContentStatus: ServiceStatus | undefined = undefined
  async function getContentStatus() {
    if (lastContentStatus && Date.now() - lastContentStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastContentStatus
    }

    lastContentStatus = {
      time: Date.now(),
      healthy: false,
      publicUrl: contentUrl.toString()
    }

    try {
      const data = await fetchJson(contentUrl, 'status')
      lastContentStatus.healthy = data['synchronizationStatus']['synchronizationState'] === 'Syncing'
    } catch (err: any) {
      logger.error(err)
    }

    return lastContentStatus
  }
  return {
    getLambdasStatus,
    getContentStatus
  }
}
