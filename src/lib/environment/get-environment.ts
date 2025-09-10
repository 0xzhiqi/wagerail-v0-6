import { clientEnv } from '../schemas'

export function getEnvironment() {
  // Fallback to URL detection if needed
  let currentDomain = ''
  if (typeof window !== 'undefined') {
    currentDomain = window.location.hostname
  }

  return {
    isDevnet: clientEnv.NODE_ENV === 'development',
    isProd: clientEnv.NODE_ENV === 'production',
    isMainnet:
      clientEnv.NEXT_PUBLIC_APP_ENV === 'production' ||
      currentDomain === 'app.wagerail.com',
    isTestnet:
      clientEnv.NEXT_PUBLIC_APP_ENV === 'testnet' ||
      currentDomain === 'testnet.wagerail.com',
    isHomepage: currentDomain === 'www.wagerail.com',
    currentDomain,
    appEnv: clientEnv.NEXT_PUBLIC_APP_ENV,
  }
}
