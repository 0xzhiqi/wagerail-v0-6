import { defineChain } from 'thirdweb'

import { getAppUrls } from './get-app-urls'
import { getEnvironment } from './get-environment'

export function getChain() {
  const env = getEnvironment()
  const urls = getAppUrls()

  return defineChain({
    id: 43114,
    name: 'Avalanche C-Chain',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpc: urls.rpcUrl,
    ...(!env.isMainnet && { testnet: true as const }),
  })
}

export const chain = getChain()
