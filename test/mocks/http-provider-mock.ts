import { Callback, HTTPProvider, RPCMessage } from 'eth-connect'

export function createHttpProviderMock(message?: any): HTTPProvider {
  return {
    host: '',
    options: {},
    debug: false,
    send: () => {},
    sendAsync: async (_payload: RPCMessage | RPCMessage[], _callback: Callback): Promise<void> => {
      _callback(null, message || {})
    }
  }
}
