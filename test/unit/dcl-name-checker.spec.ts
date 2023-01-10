import { createConfigComponent } from '@well-known-components/env-config-provider'
import { Variables } from '@well-known-components/thegraph-component/dist/types'
import { createDclNameChecker } from '../../src/adapters/dcl-name-checker'
import { createLogComponent } from '@well-known-components/logger'
import { ILoggerComponent } from '@well-known-components/interfaces'

describe('dcl name checker', function () {
  let logs: ILoggerComponent

  beforeEach(async () => {
    logs = await createLogComponent({
      config: createConfigComponent({
        LOG_LEVEL: 'DEBUG'
      })
    })
  })

  it('when permission asked for invalid name returns false', async () => {
    const dclNameChecker = createDclNameChecker({
      logs,
      marketplaceSubGraph: {
        query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => ({
          names: []
        })
      }
    })

    await expect(dclNameChecker.checkPermission('0xb', '')).resolves.toBeFalsy()
  })

  it('when no names returned from TheGraph returns false', async () => {
    const dclNameChecker = createDclNameChecker({
      logs,
      marketplaceSubGraph: {
        query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => ({
          names: []
        })
      }
    })

    await expect(dclNameChecker.checkPermission('0xb', 'my-super-name.dcl.eth')).resolves.toBeFalsy()
  })

  it('when requested name is returned from TheGraph returns true', async () => {
    const dclNameChecker = createDclNameChecker({
      logs,
      marketplaceSubGraph: {
        query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => ({
          names: [
            {
              name: 'my-super-name'
            }
          ]
        })
      }
    })

    await expect(dclNameChecker.checkPermission('0xb', 'my-super-name.dcl.eth')).resolves.toBeTruthy()
  })
})
