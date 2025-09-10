import { clientEnv } from '../schemas'

export const BASE_URLS = {
  HOMEPAGE: 'https://www.wagerail.com',
  LOCAL_DEVNET_APP: 'http://localhost:3000',
  LOCAL_DEVNET_API: 'http://localhost:3000',
  LOCAL_DEVNET_RPC_URL: 'http://34.170.7.126:8545',
  LOCAL_DEVNET_FAUCET_API: 'http://34.170.7.126:3001',
  TESTNET_APP: 'https://testnet.wagerail.com',
  TESTNET_API: 'https://testnet.wagerail.com',
  TESTNET_RPC_URL: 'https://avax-c-chain-fork.wagerail.com',
  TESTNET_FAUCET_API: 'https://avax-c-chain-fork.wagerail.com/faucet',
  MAINNET_APP: 'https://app.wagerail.com',
  MAINNET_API: 'https://api.wagerail.com',
  MAINNET_RPC_URL: clientEnv.NEXT_PUBLIC_MAINNET_RPC_URL,
} as const
