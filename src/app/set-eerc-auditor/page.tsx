'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Shield,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import {
  ConnectButton,
  useActiveAccount,
  useActiveWallet,
} from 'thirdweb/react'
import { z } from 'zod'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { checkAuthStatus } from '@/actions/auth'
import { useEercAuditor } from '@/hooks/use-eerc-auditor'

// Form validation schema using the provided schema
const auditorAddressSchema = z
  .string()
  .min(1, 'Auditor address is required')
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address')
  .refine(
    (addr) => addr !== '0x0000000000000000000000000000000000000000',
    'Cannot set zero address as auditor'
  )

const auditorFormSchema = z.object({
  auditorAddress: auditorAddressSchema,
})

type AuditorFormData = z.infer<typeof auditorFormSchema>

const SetEercAuditorPage: React.FC = () => {
  const router = useRouter()
  const activeAccount = useActiveAccount()
  const activeWallet = useActiveWallet()

  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(
    null
  )

  const {
    auditorAddress,
    hasAuditor,
    auditorLoading,
    ownerLoading,
    auditorError,
    contractAddress,
    contractOwner,
    isContractOwner,
    handleSetAuditor,
    isSettingAuditor,
    setAuditorTransactionError,
    isSetAuditorConfirmed,
    setAuditorHash,
  } = useEercAuditor()

  const form = useForm<AuditorFormData>({
    resolver: zodResolver(auditorFormSchema),
    defaultValues: {
      auditorAddress: '',
    },
  })

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()
        if (!status.isAuthenticated) {
          router.push('/')
          return
        }
        setAuthStatus(status)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/')
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Handle successful auditor setting
  useEffect(() => {
    if (isSetAuditorConfirmed) {
      setMessage('Auditor set successfully!')
      setMessageType('success')
      form.reset()
    }
  }, [isSetAuditorConfirmed, form])

  // Handle transaction errors
  useEffect(() => {
    if (setAuditorTransactionError) {
      setMessage(
        setAuditorTransactionError.message ||
          'Failed to set auditor. Please try again.'
      )
      setMessageType('error')
    }
  }, [setAuditorTransactionError])

  const onSubmit = async (data: AuditorFormData) => {
    setMessage('')
    setMessageType(null)

    try {
      await handleSetAuditor(data.auditorAddress as `0x${string}`)
    } catch (error) {
      // Error is handled by the useEffect above
    }
  }

  const getButtonText = () => {
    if (isSettingAuditor) return 'Setting Auditor...'
    return 'Set Auditor'
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-white text-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!activeAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-white">
        <header className="p-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="cursor-pointer object-contain max-h-16"
              priority
            />
          </Link>
        </header>

        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Connecting Your Wallet...</CardTitle>
              <CardDescription>
                Please connect your wallet to access the Set Auditor page
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ConnectButton client={thirdwebClient} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-white">
      <header className="p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="cursor-pointer object-contain max-h-16"
            priority
          />
        </Link>

        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-2 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm shadow-lg border-purple-100/50">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-purple-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-purple-500" />
              Set eERC Contract Auditor
            </CardTitle>
            <CardDescription className="text-purple-600/80 pt-2">
              Set the auditor address for the encrypted ERC contract. Only the
              contract owner can perform this action.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Contract Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">
                Contract Information
              </h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Contract:</span>{' '}
                  {contractAddress}
                </div>
                <div>
                  <span className="font-medium">Owner:</span>{' '}
                  {ownerLoading ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Loading...
                    </span>
                  ) : (
                    contractOwner || 'Unknown'
                  )}
                </div>
                <div>
                  <span className="font-medium">Current Auditor:</span>{' '}
                  {auditorLoading ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Loading...
                    </span>
                  ) : (
                    auditorAddress || 'Not set'
                  )}
                </div>
                <div>
                  <span className="font-medium">Auditor Set:</span>{' '}
                  {auditorLoading ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Loading...
                    </span>
                  ) : hasAuditor ? (
                    'Yes'
                  ) : (
                    'No'
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Status */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-blue-700 mb-2">
                Wallet Status
              </h3>
              <div className="text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Connected: {activeAccount.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {ownerLoading ? (
                    <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                  ) : isContractOwner ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>
                    Owner Access:{' '}
                    {ownerLoading
                      ? 'Checking...'
                      : isContractOwner
                        ? 'Yes'
                        : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner Access Check */}
            {!ownerLoading && !isContractOwner && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only the contract owner can set the auditor. Your wallet
                  address does not match the contract owner.
                </AlertDescription>
              </Alert>
            )}

            {/* Set Auditor Form */}
            {!ownerLoading && isContractOwner && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="auditorAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auditor Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter auditor address (0x...)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the wallet address that will serve as the
                          auditor for this contract.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSettingAuditor || !form.formState.isValid}
                    className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                  >
                    {isSettingAuditor ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {getButtonText()}
                      </>
                    ) : (
                      getButtonText()
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* Transaction Hash */}
            {setAuditorHash && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Transaction Hash:
                </p>
                <p className="text-xs font-mono text-blue-600 break-all">
                  {setAuditorHash}
                </p>
              </div>
            )}

            {/* Messages */}
            {message && messageType && (
              <Alert
                className={
                  messageType === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-green-200 bg-green-50'
                }
              >
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription
                  className={
                    messageType === 'error' ? 'text-red-700' : 'text-green-700'
                  }
                >
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Auditor Error */}
            {auditorError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load contract information: {auditorError.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default SetEercAuditorPage
