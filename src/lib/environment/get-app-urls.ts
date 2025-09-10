import { BASE_URLS } from '../constants/urls'
import { getEnvironment } from './get-environment'

export function getAppUrls() {
  const env = getEnvironment()

  return {
    homepage: BASE_URLS.HOMEPAGE,
    currentApp: env.isDevnet
      ? BASE_URLS.LOCAL_DEVNET_APP
      : env.isTestnet
        ? BASE_URLS.TESTNET_APP
        : BASE_URLS.MAINNET_APP,
    authApi: env.isDevnet
      ? BASE_URLS.LOCAL_DEVNET_API
      : env.isTestnet
        ? BASE_URLS.TESTNET_API
        : BASE_URLS.MAINNET_API,
    rpcUrl: env.isDevnet
      ? BASE_URLS.LOCAL_DEVNET_RPC_URL
      : env.isTestnet
        ? BASE_URLS.TESTNET_RPC_URL
        : BASE_URLS.MAINNET_RPC_URL,
    faucetApi: env.isDevnet
      ? BASE_URLS.LOCAL_DEVNET_FAUCET_API
      : env.isTestnet
        ? BASE_URLS.TESTNET_FAUCET_API
        : BASE_URLS.TESTNET_FAUCET_API, // Use testnet for mainnet fallback TODO: Update
  }
}
