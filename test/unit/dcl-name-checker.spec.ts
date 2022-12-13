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

  describe('when wallet owns no names', function () {
    let dclNameChecker

    beforeEach(async () => {
      dclNameChecker = createDclNameChecker({
        logs,
        marketplaceSubGraph: {
          query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => ({
            names: []
          })
        }
      })
    })

    it('and no specific name is requested', async () => {
      await expect(dclNameChecker.determineDclNameToUse('0xb', { metadata: {} })).resolves.toBeUndefined()
    })

    it('and a specific name is requested', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'my-super-name.dcl.eth' } }
        })
      ).resolves.toBeUndefined()
    })

    it('and a specific name is requested but it is not an owned one', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'other.dcl.eth' } }
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('when wallet owns one name', function () {
    let dclNameChecker

    beforeEach(async () => {
      dclNameChecker = createDclNameChecker({
        logs,
        marketplaceSubGraph: {
          query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => {
            return {
              names: [
                {
                  name: 'my-super-name'
                }
              ]
            }
          }
        }
      })
    })

    it('and no specific name is requested', async () => {
      await expect(dclNameChecker.determineDclNameToUse('0xb', { metadata: {} })).resolves.toBe('my-super-name.dcl.eth')
    })

    it('and a specific name is requested', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'my-super-name.dcl.eth' } }
        })
      ).resolves.toBe('my-super-name.dcl.eth')
    })

    it('and a specific name is requested but it is not an owned one', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'other.dcl.eth' } }
        })
      ).resolves.toBe('my-super-name.dcl.eth')
    })
  })

  describe('when wallet owns multiple names', function () {
    let dclNameChecker

    beforeEach(async () => {
      dclNameChecker = createDclNameChecker({
        logs,
        marketplaceSubGraph: {
          query: async (_query: string, _variables?: Variables, _remainingAttempts?: number): Promise<any> => {
            return {
              names: [
                {
                  name: 'bar'
                },
                {
                  name: 'baz'
                },
                {
                  name: 'foo'
                }
              ]
            }
          }
        }
      })
    })

    it('and no specific name is requested', async () => {
      await expect(dclNameChecker.determineDclNameToUse('0xb', { metadata: {} })).resolves.toBe('bar.dcl.eth')
    })

    it('and a specific name is requested', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'foo.dcl.eth' } }
        })
      ).resolves.toBe('foo.dcl.eth')
    })

    it('and a specific name is requested but it is not an owned one', async () => {
      await expect(
        dclNameChecker.determineDclNameToUse('0xb', {
          metadata: { worldConfiguration: { dclName: 'other.dcl.eth' } }
        })
      ).resolves.toBe('bar.dcl.eth')
    })
  })
})
