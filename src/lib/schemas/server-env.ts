import { z } from 'zod'

const serverEnvSchema = z.object({
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY: z.string().min(1, 'AWS_ACCESS_KEY is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_SES_FROM_EMAIL: z.string().min(1, 'AWS_SES_FROM_EMAIL is required'),
})

function createServerEnv() {
  try {
    return serverEnvSchema.parse({
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL,
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
