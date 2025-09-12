'use client'

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  Shield,
} from 'lucide-react'
import { viemAdapter } from 'thirdweb/adapters/viem'
import { ConnectButton, useActiveWallet } from 'thirdweb/react'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { REGISTRAR_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { chain } from '@/lib/environment/get-chain'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { checkAuthStatus } from '@/actions/auth'
import { checkEercRegistrationStatus } from '@/actions/user'
import { useEercRegistration } from '@/hooks/use-eerc-registration'

const EercRegistrationPage: React.FC = () => {
  const router = useRouter()
  const activeWallet = useActiveWallet()
  const account = activeWallet?.getAccount()

  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasStartedRegistration, setHasStartedRegistration] = useState(false)

  const {
    register,
    isPending,
    isPreparingProof,
    isWritePending, // New state from hook for better text
    isConfirming,
    isConfirmed,
    error: hookError,
    hash,
    hasProofReady,
  } = useEercRegistration()

  const publicClient = viemAdapter.publicClient.toViem({
    client: thirdwebClient,
    chain,
  })

  const steps = [
    {
      id: 1,
      title: 'Generating encryption proof',
      description: 'Protects your identity',
      status: 'pending' as 'pending' | 'active' | 'completed',
    },
    {
      id: 2,
      title: 'Submitting registration',
      description: 'To start using encrypted tokens',
      status: 'pending' as 'pending' | 'active' | 'completed',
    },
    {
      id: 3,
      title: 'Confirming registration',
      description: 'Updating database to complete your registration',
      status: 'pending' as 'pending' | 'active' | 'completed',
    },
  ]

  // Update step status based on registration progress
  const getUpdatedSteps = () => {
    return steps.map((step, index) => {
      if (isConfirmed) {
        return { ...step, status: 'completed' as const }
      }

      if (index === 0) {
        // Step 1: Sign Message / Generate Proof
        if (hasProofReady || isWritePending || isConfirming)
          return { ...step, status: 'completed' as const }
        if (isPreparingProof) return { ...step, status: 'active' as const }
        return { ...step, status: 'pending' as const }
      }

      if (index === 1) {
        // Step 2: Register on Blockchain
        if (isConfirming) return { ...step, status: 'completed' as const }
        if (isWritePending) return { ...step, status: 'active' as const }
        return { ...step, status: 'pending' as const }
      }

      if (index === 2) {
        // Step 3: Update Database
        if (isConfirming) return { ...step, status: 'active' as const }
        return { ...step, status: 'pending' as const }
      }

      return step
    })
  }

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const updatedSteps = getUpdatedSteps()
    const completedSteps = updatedSteps.filter(
      (step) => step.status === 'completed'
    ).length
    const activeSteps = updatedSteps.filter(
      (step) => step.status === 'active'
    ).length

    if (completedSteps === 3) return 100
    if (completedSteps === 2 && activeSteps === 1) return 85
    if (completedSteps === 2) return 67
    if (completedSteps === 1 && activeSteps === 1) return 50
    if (completedSteps === 1) return 33
    if (activeSteps === 1) return 15
    return 0
  }

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

  // Check registration status
  useEffect(() => {
    const checkRegistration = async () => {
      if (!account || !authStatus?.isAuthenticated) {
        setIsCheckingRegistration(false)
        return
      }

      try {
        const registered = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.REGISTRAR as `0x${string}`,
          abi: REGISTRAR_ABI,
          functionName: 'isUserRegistered',
          args: [account.address],
        })

        setIsRegistered(registered)

        if (registered) {
          const dbStatus = await checkEercRegistrationStatus()
          if (dbStatus.success && !dbStatus.eercRegistered) {
            try {
              await fetch('/api/user/update-eerc-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              })
              console.log('Updated database with EERC registration status')
            } catch (dbError) {
              console.warn('Failed to update database:', dbError)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check registration status:', error)
        setIsRegistered(false)
      } finally {
        setIsCheckingRegistration(false)
      }
    }

    checkRegistration()
  }, [account, publicClient, authStatus])

  // Handle registration success
  useEffect(() => {
    if (isConfirmed) {
      setIsRegistered(true)
      setError(null)
    }
  }, [isConfirmed])

  // Handle errors
  useEffect(() => {
    if (hookError) {
      setError(hookError.message || 'Registration failed. Please try again.')
    }
  }, [hookError])

  const handleRegister = async () => {
    setHasStartedRegistration(true)
    setError(null)
    await register()
  }

  const getButtonText = () => {
    if (isPreparingProof) return 'Generating Encryption Proof...'
    if (isWritePending) return 'Submitting Registration...'
    if (isConfirming) return 'Confirming Registration...'
    if (isConfirmed) return 'Registration Complete'
    return 'Start Registration'
  }

  // Enhanced registration status component
  const RegistrationStatus = () => {
    if (isCheckingRegistration) {
      return (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
              <div className="absolute inset-0 animate-pulse bg-slate-200 rounded-full opacity-25"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                Checking Registration Status
              </p>
              <p className="text-xs text-slate-500">
                Verifying your eERC registration...
              </p>
            </div>
          </div>
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-slate-300 to-slate-400 animate-pulse"></div>
        </div>
      )
    }

    if (isRegistered) {
      return <></>
    }

    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 rounded-2xl px-6 py-4 shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <div className="relative">
            <div className="bg-amber-100 rounded-full p-2">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-800">
              Awaiting Registration
            </p>
            <p className="text-sm text-amber-600">
              Complete registration to access encrypted tokens
            </p>
          </div>
        </div>
        <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-amber-400 to-orange-500"></div>
        <div className="absolute inset-0 bg-amber-200 opacity-10 animate-pulse"></div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-white text-gray-800">
      <header className="p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="cursor-pointer object-contain max-h-16 "
            priority
          />
        </Link>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm shadow-lg border-purple-100/50">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-purple-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-purple-500" />
              Register for eERC
            </CardTitle>
            <CardDescription className="text-purple-600/80 pt-2">
              {' '}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-8">
              <div className="flex justify-center">
                <RegistrationStatus />
              </div>

              {!isRegistered &&
                hasStartedRegistration &&
                activeWallet &&
                authStatus?.isAuthenticated && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-gray-700">
                        <span>Registration Progress</span>
                        <span>{Math.round(getProgressPercentage())}%</span>
                      </div>
                      <Progress
                        value={getProgressPercentage()}
                        className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-violet-400 [&>div]:to-purple-500"
                      />
                    </div>

                    <div className="space-y-4">
                      {getUpdatedSteps().map((step) => (
                        <div
                          key={step.id}
                          className="flex items-start space-x-4"
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              step.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : step.status === 'active'
                                  ? 'bg-violet-100 text-violet-800'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {step.status === 'completed' ? (
                              <Check className="w-4 h-4" />
                            ) : step.status === 'active' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              step.id
                            )}
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                step.status === 'active'
                                  ? 'text-violet-800'
                                  : 'text-gray-900'
                              }`}
                            >
                              {step.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {hash && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                          Transaction Hash:
                        </p>
                        <p className="text-xs font-mono text-blue-600 break-all">
                          {hash}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {!activeWallet ? (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-gray-600 mb-4">
                    Connecting your wallet to continue ...
                  </p>
                  <ConnectButton client={thirdwebClient} />
                </div>
              ) : !authStatus?.isAuthenticated ? (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-gray-600 mb-4">
                    Please authenticate your account first
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : isRegistered ? (
                <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-800 mb-2">
                    Registration Complete!
                  </h3>
                  <p className="text-green-700 mb-6">
                    You can now use encrypted tokens and private transactions.
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Return to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Button
                    onClick={handleRegister}
                    disabled={isPending || isCheckingRegistration}
                    className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 text-lg font-semibold"
                  >
                    {isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2" />
                        {getButtonText()}
                      </span>
                    ) : (
                      getButtonText()
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default EercRegistrationPage
