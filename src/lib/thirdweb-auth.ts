import { createAuth } from 'thirdweb/auth'
import { privateKeyToAccount } from 'thirdweb/wallets'
import { serverEnv } from '@/lib/schemas/server-env'

import { thirdwebServerClient } from './clients/thirdweb-server-client'
import { getAppUrls } from './environment'

const { currentApp } = getAppUrls()

export const thirdwebAuth = createAuth({
  domain: currentApp,
  client: thirdwebServerClient,
  adminAccount: privateKeyToAccount({
    client: thirdwebServerClient,
    privateKey: serverEnv.THIRDWEB_ADMIN_PRIVATE_KEY,
  }),
})
