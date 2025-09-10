import { SESClient } from '@aws-sdk/client-ses'
import { serverEnv } from '@/lib/schemas/server-env'

export const awsSesClient = new SESClient({
  region: serverEnv.AWS_SES_REGION,
  credentials: {
    accessKeyId: serverEnv.AWS_SES_ACCESS_KEY,
    secretAccessKey: serverEnv.AWS_SES_SECRET_ACCESS_KEY,
  },
})
