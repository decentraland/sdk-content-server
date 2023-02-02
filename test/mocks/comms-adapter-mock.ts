import { EthAddress } from '@dcl/schemas'
import { CommsStatus, ICommsAdapter } from '../../src/types'

export function createMockCommsAdapterComponent(): ICommsAdapter {
  return {
    connectionString(ethAddress: EthAddress, roomId: string): Promise<string> {
      return Promise.resolve(`ws-room:ws-room-service.decentraland.org/rooms/${roomId}`)
    },
    status(): Promise<CommsStatus> {
      return Promise.resolve({
        users: 2,
        rooms: 1,
        details: [
          {
            worldName: 'mariano.dcl.eth',
            users: 2
          }
        ]
      })
    }
  }
}
