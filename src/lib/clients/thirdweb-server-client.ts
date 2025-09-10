import { createThirdwebClient } from 'thirdweb'
import { serverEnv } from '@/lib/schemas/server-env'

export const thirdwebServerClient = createThirdwebClient({
  secretKey: serverEnv.THIRDWEB_SECRET_KEY,
})
