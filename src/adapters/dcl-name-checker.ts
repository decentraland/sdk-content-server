import { AppComponents, IWorldNamePermissionChecker } from '../types'
import { EthAddress } from '@dcl/schemas'
import LRU from 'lru-cache'
import { ContractFactory, RequestManager } from 'eth-connect'
import { checkerAbi, checkerContracts, registrarContracts } from '@dcl/catalyst-contracts'

type NamesResponse = {
  names: { name: string }[]
}

export const createDclNameChecker = (
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph'>
): IWorldNamePermissionChecker => {
  const logger = components.logs.getLogger('check-permissions')
  logger.info('Using TheGraph DclNameChecker')

  const cache = new LRU<EthAddress, string[]>({
    max: 100,
    ttl: 5 * 60 * 1000, // cache for 5 minutes
    fetchMethod: async (ethAddress: EthAddress): Promise<string[]> => {
      const result = await components.marketplaceSubGraph.query<NamesResponse>(
        `
      query FetchNames($ethAddress: String) {
          names: nfts(where: { owner: $ethAddress, category: ens }, orderBy: name, first: 1000) {
            name
          }
       }`,
        {
          ethAddress: ethAddress.toLowerCase()
        }
      )

      const names = result.names.map(({ name }) => `${name.toLowerCase()}.dcl.eth`)

      logger.debug(`Fetched names for address ${ethAddress}: ${names}`)
      return names
    }
  })

  const checkPermission = async (ethAddress: EthAddress, worldName: string): Promise<boolean> => {
    if (worldName.length === 0) {
      return false
    }

    const names = (await cache.fetch(ethAddress.toLowerCase()))!
    return names.includes(worldName.toLowerCase())
  }

  return {
    checkPermission
  }
}

export const createOnChainDclNameChecker = async (
  components: Pick<AppComponents, 'config' | 'logs' | 'ethereumProvider'>
): Promise<IWorldNamePermissionChecker> => {
  const logger = components.logs.getLogger('check-permissions')
  logger.info('Using OnChain DclNameChecker')
  const networkId = await components.config.requireString('NETWORK_ID')
  const networkName = networkId === '1' ? 'mainnet' : 'goerli'
  const factory = new ContractFactory(new RequestManager(components.ethereumProvider), checkerAbi)
  const checker = (await factory.at(checkerContracts[networkName])) as any

  const checkPermission = async (ethAddress: EthAddress, worldName: string): Promise<boolean> => {
    if (worldName.length === 0 || !worldName.endsWith('.dcl.eth')) {
      return false
    }

    const hasPermission = await checker.checkName(
      ethAddress,
      registrarContracts[networkName],
      worldName.replace('.dcl.eth', ''),
      'latest'
    )

    logger.debug(`Checking name ${worldName} for address ${ethAddress}: ${hasPermission}`)

    return hasPermission
  }

  return {
    checkPermission
  }
}
