import { BASE_URLS } from '../constants/urls'
import { getEnvironment } from './get-environment'

export function getAppUrls() {
  const env = getEnvironment()

  return {
    homepage: BASE_URLS.HOMEPAGE,
    currentApp: env.isDev
      ? BASE_URLS.LOCAL_DEVNET_APP
      : env.isTestnet
        ? BASE_URLS.TESTNET_APP
        : BASE_URLS.MAINNET_APP,
    authApi: env.isDev
      ? BASE_URLS.LOCAL_DEVNET_API
      : env.isTestnet
        ? BASE_URLS.TESTNET_API
        : BASE_URLS.MAINNET_API,
    rpcUrl: env.isDev
      ? BASE_URLS.LOCAL_DEVNET_RPC_URL
      : env.isTestnet
        ? BASE_URLS.TESTNET_RPC_URL
        : BASE_URLS.MAINNET_RPC_URL,
  }
}
