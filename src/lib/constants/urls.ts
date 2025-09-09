import { clientEnv } from '../schemas'

export const BASE_URLS = {
  HOMEPAGE: 'https://www.wagerail.com',
  LOCAL_DEVNET_APP: 'http://localhost:3000',
  LOCAL_DEVNET_API: 'http://localhost:3000',
  LOCAL_DEVNET_RPC_URL: '', // TODO: Add after setup
  TESTNET_APP: 'https://testnet.wagerail.com',
  TESTNET_API: 'https://testnet-api.wagerail.com',
  TESTNET_RPC_URL: '', // TODO: Add after setup
  MAINNET_APP: 'https://app.wagerail.com',
  MAINNET_API: 'https://api.wagerail.com',
  MAINNET_RPC_URL: clientEnv.NEXT_PUBLIC_MAINNET_RPC_URL,
} as const
