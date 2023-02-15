import { AppComponents, IWorldNamePermissionChecker } from '../types'
import { EthAddress } from '@dcl/schemas'
import LRU from 'lru-cache'
import { ContractFactory, RequestManager } from 'eth-connect'
import { checkerAbi, checkerContracts, registrarContracts } from '@dcl/catalyst-contracts'

type NamesResponse = {
  nfts: { name: string; owner: { id: string } }[]
}

export const createDclNameChecker = (
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph'>
): IWorldNamePermissionChecker => {
  const logger = components.logs.getLogger('check-permissions')
  logger.info('Using TheGraph DclNameChecker')

  const cache = new LRU<string, string | undefined>({
    max: 100,
    ttl: 5 * 60 * 1000, // cache for 5 minutes
    fetchMethod: async (worldName: string): Promise<string | undefined> => {
      /*
      DCL owners are case-sensitive, so when searching by dcl name in TheGraph we
      need to do a case-insensitive search because the worldName provided as fetch key
      may not be in the exact same case of the registered name. There are several methods
      suffixed _nocase, but not one for equality, so this is a bit hackish, but it works.
       */
      const result = await components.marketplaceSubGraph.query<NamesResponse>(
        `
        query FetchOwnerForDclName($worldName: String) {
          nfts(
            where: {name_starts_with_nocase: $worldName, name_ends_with_nocase: $worldName, category: ens}
            orderBy: name
            first: 1000
          ) {
            name
            owner {
              id
            }
          }
        }`,
        {
          worldName: worldName.toLowerCase().replace('.dcl.eth', '')
        }
      )
      logger.info(`Fetched owner of world ${worldName}: ${result.nfts.map(({ owner }) => owner.id.toLowerCase())}`)

      const owners = result.nfts
        .filter((nft) => `${nft.name.toLowerCase()}.dcl.eth` === worldName.toLowerCase())
        .map(({ owner }) => owner.id.toLowerCase())

      return owners.length > 0 ? owners[0] : undefined
    }
  })

  const checkPermission = async (ethAddress: EthAddress, worldName: string): Promise<boolean> => {
    if (worldName.length === 0) {
      return false
    }

    const owner = await cache.fetch(worldName)
    return !!owner && owner === ethAddress.toLowerCase()
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
