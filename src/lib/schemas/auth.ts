import { z } from 'zod'

export const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
})

export const verificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  verificationCode: z
    .string()
    .min(6, 'Verification code must be 6 characters')
    .max(6, 'Verification code must be 6 characters')
    .optional(),
})

export type EmailLoginInput = z.infer<typeof emailLoginSchema>
export type VerificationInput = z.infer<typeof verificationSchema>
