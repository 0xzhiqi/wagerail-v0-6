import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_THIRDWEB_CLIENT_ID is required'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'testnet', 'production']),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_MAINNET_RPC_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_MAINNET_RPC_URL is required'),
})

function createClientEnv() {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_THIRDWEB_CLIENT_ID:
        process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_MAINNET_RPC_URL: process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
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

export const clientEnv = createClientEnv()
