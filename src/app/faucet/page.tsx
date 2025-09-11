'use client'

import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle,
  ChevronLeft,
  CircleDollarSign,
  Droplets,
  Loader2,
  RefreshCw,
  Triangle,
  Wallet,
} from 'lucide-react'
import { getContract, toEther } from 'thirdweb'
import { balanceOf } from 'thirdweb/extensions/erc20'
import { useActiveAccount, useConnect } from 'thirdweb/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { getAppUrls } from '@/lib/environment'
import { chain } from '@/lib/environment/get-chain'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { checkAuthStatus } from '@/actions/auth'

interface FaucetResponse {
  success: boolean
  message?: string
  error?: string
  amount?: string
  recipient?: string
  tokenType?: string
  environment?: string
}

interface BatchFaucetResponse {
  success: boolean
  results: FaucetResponse[]
  summary?: string
  environment?: string
}

export default function FaucetPage() {
  const router = useRouter()
  const account = useActiveAccount()
  const { connect } = useConnect()

  // Authentication state
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Existing state
  const [usdcAmount, setUsdcAmount] = useState('100')
  const [avaxAmount, setAvaxAmount] = useState('10')
  const [loadingButton, setLoadingButton] = useState<'usdc' | 'avax' | null>(
    null
  )
  const [results, setResults] = useState<FaucetResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isWalletLoading, setIsWalletLoading] = useState(true)
  const [walletReconnectAttempted, setWalletReconnectAttempted] =
    useState(false)
  const [refreshBalances, setRefreshBalances] = useState(0)

  const { faucetApi } = getAppUrls() // Use the new faucetApi URL

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

  // Get thirdweb client for contract interactions
  const [thirdwebClient, setThirdwebClient] = useState<any>(null)

  useEffect(() => {
    const loadClient = async () => {
      try {
        const { thirdwebClient: client } = await import(
          '@/lib/clients/thirdweb-client'
        )
        setThirdwebClient(client)
      } catch (error) {
        console.error('Failed to load thirdweb client:', error)
      }
    }
    loadClient()
  }, [])

  // USDC Contract - memoized to prevent recreation on every render
  const usdcContract = useMemo(() => {
    if (!thirdwebClient) return null
    return getContract({
      client: thirdwebClient,
      chain: chain,
      address: CONTRACT_ADDRESSES.USDC,
    })
  }, [thirdwebClient])

  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [usdcBalanceLoading, setUsdcBalanceLoading] = useState(false)

  // Helper function to format USDC balance (6 decimals)
  const formatUsdcBalance = (balance: bigint) => {
    // Convert from wei to USDC (6 decimals)
    const divisor = BigInt(10 ** 6)
    const wholePart = balance / divisor
    const fractionalPart = balance % divisor

    // Convert to number for formatting
    const wholeNumber = Number(wholePart)
    const fractionalNumber = Number(fractionalPart) / 10 ** 6

    return wholeNumber + fractionalNumber
  }

  const fetchUsdcBalance = useCallback(async () => {
    if (!account?.address || !usdcContract) return

    setUsdcBalanceLoading(true)
    try {
      const balance = await balanceOf({
        contract: usdcContract,
        address: account.address,
      })
      setUsdcBalance(balance)
    } catch (error) {
      console.error('Failed to fetch USDC balance:', error)
    } finally {
      setUsdcBalanceLoading(false)
    }
  }, [account?.address, usdcContract])

  // Fetch USDC balance when dependencies change
  useEffect(() => {
    fetchUsdcBalance()
  }, [fetchUsdcBalance, refreshBalances])

  const [avaxBalanceState, setAvaxBalanceState] = useState<bigint | null>(null)
  const [avaxBalanceLoading, setAvaxBalanceLoading] = useState(false)

  const fetchAvaxBalance = useCallback(async () => {
    if (!account?.address || !thirdwebClient) return

    setAvaxBalanceLoading(true)
    try {
      const { getRpcClient } = await import('thirdweb/rpc')
      const rpcRequest = getRpcClient({ client: thirdwebClient, chain })

      const balance = await rpcRequest({
        method: 'eth_getBalance',
        params: [account.address, 'latest'],
      })

      setAvaxBalanceState(BigInt(balance))
    } catch (error) {
      console.error('Failed to fetch AVAX balance:', error)
    } finally {
      setAvaxBalanceLoading(false)
    }
  }, [account?.address, thirdwebClient])

  // Fetch AVAX balance when account changes
  useEffect(() => {
    fetchAvaxBalance()
  }, [fetchAvaxBalance, refreshBalances])

  // Refresh all balances
  const handleRefreshBalances = () => {
    setRefreshBalances((prev) => prev + 1)
    fetchUsdcBalance()
    fetchAvaxBalance()
  }

  // Auto-reconnect wallet on page load
  useEffect(() => {
    const attemptWalletReconnect = async () => {
      if (walletReconnectAttempted) return

      try {
        const { thirdwebWallet } = await import('@/lib/clients/thirdweb-wallet')
        const { thirdwebClient } = await import('@/lib/clients/thirdweb-client')

        console.log('Attempting wallet auto-reconnect...')
        await thirdwebWallet.autoConnect({ client: thirdwebClient })

        if (thirdwebWallet.getAccount()) {
          await connect(async () => thirdwebWallet)
          console.log('Wallet reconnected successfully')
        }
      } catch (error) {
        console.log('Wallet auto-reconnect failed:', error)
      } finally {
        setWalletReconnectAttempted(true)
      }
    }

    attemptWalletReconnect()
  }, [connect, walletReconnectAttempted])

  // Handle wallet loading state
  useEffect(() => {
    if (!walletReconnectAttempted) return

    // Give the wallet some time to initialize
    const timer = setTimeout(() => {
      setIsWalletLoading(false)
    }, 2000) // 2 second timeout

    // If account is available, stop loading immediately
    if (account?.address) {
      setIsWalletLoading(false)
      clearTimeout(timer)
    }

    return () => clearTimeout(timer)
  }, [account?.address, walletReconnectAttempted])

  // Test API connectivity
  const testConnection = async () => {
    try {
      const response = await fetch(`${faucetApi}/health`)
      const data = await response.json()
      console.log('Faucet API Health Check:', data)
    } catch (err) {
      console.error('Faucet API connection test failed:', err)
    }
  }

  useEffect(() => {
    testConnection()
  }, [faucetApi])

  const handleSingleFaucet = async (tokenType: 'usdc' | 'avax') => {
    if (!account?.address) {
      console.log('walau')
      setError('Please connect your wallet first')
      return
    }

    setLoadingButton(tokenType)
    setError(null)
    setResults([])

    try {
      const amount =
        tokenType === 'usdc' ? parseFloat(usdcAmount) : parseFloat(avaxAmount)

      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount')
        return
      }

      if (tokenType === 'usdc' && amount > 10000) {
        setError('USDC amount cannot exceed 10,000')
        return
      }

      if (tokenType === 'avax' && amount > 50) {
        setError('AVAX amount cannot exceed 50')
        return
      }

      console.log(`Making request to: ${faucetApi}/api/faucet/${tokenType}`)

      const response = await fetch(`${faucetApi}/api/faucet/${tokenType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.address,
          amount: amount,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: FaucetResponse = await response.json()

      if (data.success) {
        setResults([data])
        setError(null)
        // Refresh balances after successful faucet request
        setTimeout(() => {
          handleRefreshBalances()
        }, 2000) // Wait 2 seconds for transaction to be mined
      } else {
        setError(data.error || 'Faucet request failed')
      }
    } catch (err) {
      console.error('Faucet error:', err)
      setError(
        `Network error: ${err instanceof Error ? err.message : 'Please try again.'}`
      )
    } finally {
      setLoadingButton(null)
    }
  }

  // Show loading spinner during authentication check
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If no auth status after loading, show loading (redirect handled in useEffect)
  if (!authStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Droplets className="h-8 w-8 text-purple-600" />
              <span>Testnet Faucet</span>
            </h1>
            <p className="text-gray-600 mt-1">Get free AVAX and USDC tokens</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
        </div>

        {/* Wallet Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Status</span>
              </div>
              {account?.address && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshBalances}
                  disabled={usdcBalanceLoading || avaxBalanceLoading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${usdcBalanceLoading || avaxBalanceLoading ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWalletLoading || !walletReconnectAttempted ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
                  <p className="text-gray-600">
                    {!walletReconnectAttempted
                      ? 'Reconnecting wallet...'
                      : 'Loading wallet connection...'}
                  </p>
                </div>
              </div>
            ) : account?.address ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Wallet Address:</p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                    {account.address}
                  </p>
                </div>

                {/* Token Balances */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">USDC Balance</p>
                    {usdcBalanceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <p className="font-semibold text-lg">
                        {usdcBalance !== null
                          ? formatUsdcBalance(usdcBalance).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              }
                            )
                          : '0.00'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">USDC</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">AVAX Balance</p>
                    {avaxBalanceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <p className="font-semibold text-lg">
                        {avaxBalanceState
                          ? Number(toEther(avaxBalanceState)).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              }
                            )
                          : '0.00'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">AVAX</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your wallet needs to be reconnected to use the faucet
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={async () => {
                    try {
                      const { thirdwebWallet } = await import(
                        '@/lib/clients/thirdweb-wallet'
                      )
                      await connect(async () => thirdwebWallet)
                    } catch (error) {
                      console.error('Manual reconnect failed:', error)
                    }
                  }}
                  className="w-full"
                >
                  Reconnect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faucet Controls */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* USDC Faucet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-600">
                <CircleDollarSign className="h-5 w-5" />
                <span>USDC Faucet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (Max: 10,000 USDC)
                </label>
                <Input
                  type="number"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  placeholder="100"
                  min="1"
                  max="10000"
                  disabled={
                    loadingButton !== null ||
                    isWalletLoading ||
                    !walletReconnectAttempted
                  }
                />
              </div>
              <Button
                onClick={() => handleSingleFaucet('usdc')}
                disabled={
                  loadingButton !== null ||
                  isWalletLoading ||
                  !account?.address ||
                  !walletReconnectAttempted
                }
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {loadingButton === 'usdc' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Get USDC
              </Button>
            </CardContent>
          </Card>

          {/* AVAX Faucet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-600">
                <Triangle className="h-5 w-5" />
                <span>AVAX Faucet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (Max: 50 AVAX)
                </label>
                <Input
                  type="number"
                  value={avaxAmount}
                  onChange={(e) => setAvaxAmount(e.target.value)}
                  placeholder="10"
                  min="1"
                  max="50"
                  disabled={
                    loadingButton !== null ||
                    isWalletLoading ||
                    !walletReconnectAttempted
                  }
                />
              </div>
              <Button
                onClick={() => handleSingleFaucet('avax')}
                disabled={
                  loadingButton !== null ||
                  isWalletLoading ||
                  !account?.address ||
                  !walletReconnectAttempted
                }
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {loadingButton === 'avax' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Get AVAX
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRightLeft className="h-5 w-5" />
                <span>Transaction Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {result.tokenType?.toUpperCase()} Faucet
                        </p>
                        <p className="text-sm text-gray-600">
                          {result.success ? result.message : result.error}
                        </p>
                        {result.amount && (
                          <p className="text-sm text-gray-500">
                            Amount: {result.amount}{' '}
                            {result.tokenType?.toUpperCase()} received
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {result.success ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• These are testnet tokens with no real value</p>
              <p>• USDC limit: 10,000 tokens per request</p>
              <p>• AVAX limit: 50 tokens per request</p>
              <p>• Tokens will be sent to your connected wallet address</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
