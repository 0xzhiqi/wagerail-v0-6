import { z } from 'zod'

const serverEnvSchema = z.object({
  // Thirdweb environment variables
  THIRDWEB_SECRET_KEY: z.string().min(1, 'THIRDWEB_SECRET_KEY is required'),
  THIRDWEB_ADMIN_PRIVATE_KEY: z
    .string()
    .min(1, 'THIRDWEB_ADMIN_PRIVATE_KEY is required'),

  // AWS SES environment variables
  AWS_SES_REGION: z.string().default('us-east-1'),
  AWS_SES_ACCESS_KEY: z.string().min(1, 'AWS_SES_ACCESS_KEY is required'),
  AWS_SES_SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'AWS_SES_SECRET_ACCESS_KEY is required'),
  AWS_SES_FROM_EMAIL: z.string().min(1, 'AWS_SES_FROM_EMAIL is required'),
})

function createServerEnv() {
  try {
    return serverEnvSchema.parse({
      AWS_SES_REGION: process.env.AWS_SES_REGION,
      AWS_SES_ACCESS_KEY: process.env.AWS_SES_ACCESS_KEY,
      AWS_SES_SECRET_ACCESS_KEY: process.env.AWS_SES_SECRET_ACCESS_KEY,
      AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL,
      THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY,
      THIRDWEB_ADMIN_PRIVATE_KEY: process.env.THIRDWEB_ADMIN_PRIVATE_KEY,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      throw new Error(`❌ Invalid environment variables:\n${missingVars}`)
    }
    throw error
  }
}

export const serverEnv = createServerEnv()
