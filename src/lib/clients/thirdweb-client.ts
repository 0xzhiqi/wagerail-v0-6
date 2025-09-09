import { createThirdwebClient } from 'thirdweb'
import { clientEnv } from '@/lib/schemas'

export const thirdwebClient = createThirdwebClient({
  clientId: clientEnv.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
})
