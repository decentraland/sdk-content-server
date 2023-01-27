import { IStatusComponent, ServiceStatus } from '../../src/adapters/status'

export function createMockStatusComponent(): IStatusComponent {
  return {
    getContentStatus(): Promise<ServiceStatus> {
      return Promise.resolve({
        time: Date.now(),
        healthy: true,
        publicUrl: 'https://peer.com/content'
      })
    },
    getLambdasStatus(): Promise<ServiceStatus> {
      return Promise.resolve({
        time: Date.now(),
        healthy: true,
        publicUrl: 'https://peer.com/lambdas'
      })
    }
  }
}
