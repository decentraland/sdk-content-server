import { Request, Response } from 'node-fetch'
import { createLimitsManagerComponent } from '../../src/adapters/limits-manager'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { IFetchComponent } from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'

describe('limits manager', function () {
  it('fetches and updates config', async () => {
    const config = createConfigComponent({
      MAX_PARCELS: '4',
      MAX_SIZE: '200',
      ALLOW_SDK6: 'false',
      WHITELIST_URL: 'http://localhost/whitelist.json'
    })

    const fetch: IFetchComponent = {
      fetch: async (_url: Request): Promise<Response> =>
        new Response(
          JSON.stringify({
            'purchased.dcl.eth': {
              max_parcels: 44,
              max_size_in_mb: 160,
              allow_sdk6: true
            }
          })
        )
    }

    const limitsManager = await createLimitsManagerComponent({
      config,
      fetch,
      logs: await createLogComponent({ config })
    })

    // When whitelisted
    expect(await limitsManager.getAllowSdk6For('purchased.dcl.eth')).toBeTruthy()
    expect(await limitsManager.getMaxAllowedSizeInMbFor('purchased.dcl.eth')).toBe(160)
    expect(await limitsManager.getMaxAllowedParcelsFor('purchased.dcl.eth')).toBe(44)

    // When default
    expect(await limitsManager.getAllowSdk6For('whatever.dcl.eth')).toBeFalsy()
    expect(await limitsManager.getMaxAllowedSizeInMbFor('whatever.dcl.eth')).toBe(200)
    expect(await limitsManager.getMaxAllowedParcelsFor('whatever.dcl.eth')).toBe(4)
  })
})
