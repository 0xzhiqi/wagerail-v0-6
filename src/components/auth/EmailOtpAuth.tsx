'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { signLoginPayload } from 'thirdweb/auth'
import { useConnect } from 'thirdweb/react'
import { preAuthenticate } from 'thirdweb/wallets/in-app'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { emailLoginSchema, type EmailLoginInput } from '@/lib/schemas/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { generateLoginPayload, verifyLoginAndCreateUser } from '@/actions/auth'

import { thirdwebWallet } from '../../lib/clients/thirdweb-wallet'

interface EmailOtpAuthProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function EmailOtpAuth({ onSuccess, onError }: EmailOtpAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [emailForOtp, setEmailForOtp] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  const router = useRouter()
  const { connect } = useConnect()

  const emailForm = useForm<EmailLoginInput>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
    },
  })

  const sendOtp = async (email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await preAuthenticate({
        client: thirdwebClient,
        strategy: 'email',
        email: email,
      })

      setEmailForOtp(email)
      setIsOtpSent(true)
    } catch (error) {
      console.error('Error sending OTP:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send verification code'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Starting OTP verification for:', emailForOtp)
      console.log('About to connect wallet...')

      const connectedWallet = await connect(async () => {
        console.log('Inside connect callback - about to call thirdwebWallet.connect')
        
        // Use basic wallet for authentication to avoid initialization issues
        const result = await thirdwebWallet.connect({
          client: thirdwebClient,
          strategy: 'email',
          email: emailForOtp,
          verificationCode: verificationCode,
        })
        
        console.log('thirdwebWallet.connect completed successfully')
        return thirdwebWallet
      })

      console.log('connect() call completed')

      if (!connectedWallet) {
        throw new Error('Failed to connect wallet')
      }

      console.log('Wallet connected successfully')

      // Get account from connected wallet
      const account = connectedWallet.getAccount()
      if (!account) {
        throw new Error('Failed to get account from wallet')
      }

      console.log('Account address:', account.address)

      // Generate login payload
      const payloadResult = await generateLoginPayload(account.address)

      if (!payloadResult.success || !payloadResult.payload) {
        console.error('Payload generation failed:', payloadResult.error)
        throw new Error(
          payloadResult.error || 'Failed to generate login payload'
        )
      }

      console.log('Login payload generated successfully', payloadResult.payload)

      // Use thirdweb v5 signLoginPayload function
      const signedPayload = await signLoginPayload({
        payload: payloadResult.payload,
        account: account,
      })

      console.log('Message signed successfully')

      // Verify login and create/update user in database
      const authResult = await verifyLoginAndCreateUser(
        payloadResult.payload,
        signedPayload.signature,
        emailForOtp
      )

      console.log('Auth result:', authResult)

      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed')
      }

      console.log('Authentication successful')

      // Success callback
      onSuccess?.()

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Verification error:', error)

      // Provide more specific error messages
      let errorMessage = 'Verification failed'

      if (error instanceof Error) {
        if (error.message.includes('Invalid verification code')) {
          errorMessage =
            'Invalid verification code. Please check your email and try again.'
        } else if (error.message.includes('Verification code expired')) {
          errorMessage =
            'Verification code has expired. Please request a new one.'
        } else if (error.message.includes('Failed to connect wallet')) {
          errorMessage =
            'Failed to verify code. Please try again or request a new code.'
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setIsOtpSent(false)
    setEmailForOtp('')
    setVerificationCode('')
    setError(null)
    emailForm.reset()
  }

  // Handle Enter key press for OTP verification
  const handleOtpKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && verificationCode.length === 6) {
      e.preventDefault()
      verifyOtp()
    }
  }

  if (!isOtpSent) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Sign in with Email
          </h3>
          <p className="text-sm text-gray-600">
            Enter your email address to receive a verification code.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit((data) => sendOtp(data.email))}
            className="space-y-4"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send verification code'
              )}
            </Button>
          </form>
        </Form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">
          Check your email
        </h3>
        <p className="text-sm text-gray-600">
          Enter the verification code sent to <strong>{emailForOtp}</strong>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isLoading && verificationCode.length === 6) {
            verifyOtp()
          }
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="verificationCode"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Verification Code
          </label>
          <Input
            id="verificationCode"
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) =>
              setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            onKeyDown={handleOtpKeyPress}
            disabled={isLoading}
            maxLength={6}
            className="w-full text-center tracking-widest"
            autoComplete="one-time-code"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={() => sendOtp(emailForOtp)}
          disabled={isLoading}
          className="text-sm text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
        >
          Resend verification code
        </button>
        <div>
          <button
            type="button"
            onClick={resetFlow}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Use different email
          </button>
        </div>
      </div>
    </div>
  )
}
