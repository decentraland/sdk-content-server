// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createLocalFetchCompoment, createRunner } from '@well-known-components/test-helpers'

import { main } from '../src/service'
import { TestComponents } from '../src/types'
import { initComponents as originalInitComponents } from '../src/components'
import { MockedStorage } from '@dcl/catalyst-storage/dist/MockedStorage'
import { createMockMarketplaceSubGraph } from './mocks/marketplace-subgraph-mock'
import { createMockDclNameChecker } from './mocks/dcl-name-checker-mock'
import { createValidator } from '../src/adapters/validator'
import { createFetchComponent } from '../src/adapters/fetch'
import { createMockLimitsManagerComponent } from './mocks/limits-manager-mock'

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */
export const test = createRunner<TestComponents>({
  main,
  initComponents
})

async function initComponents(): Promise<TestComponents> {
  const components = await originalInitComponents()

  const { config } = components

  const storage = new MockedStorage()

  const dclNameChecker = createMockDclNameChecker()

  const fetch = await createFetchComponent()

  const limitsManager = createMockLimitsManagerComponent()

  const validator = createValidator({
    config,
    storage,
    dclNameChecker,
    limitsManager,
    ethereumProvider: components.ethereumProvider
  })

  return {
    ...components,
    localFetch: await createLocalFetchCompoment(config),
    marketplaceSubGraph: createMockMarketplaceSubGraph(),
    dclNameChecker,
    fetch,
    limitsManager,
    validator,
    storage
  }
}
