import { ISubgraphComponent } from '@well-known-components/thegraph-component'

export function createMockMarketplaceSubGraph(): ISubgraphComponent {
  return {
    query<T>(): Promise<T> {
      return Promise.resolve({
        names: []
      } as T)
    }
  }
}
