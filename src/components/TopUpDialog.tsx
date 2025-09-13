'use client'

import { CheckCircle, RefreshCw, Wallet, X } from 'lucide-react'
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
} from 'thirdweb'
import { approve, balanceOf } from 'thirdweb/extensions/erc20'
import { Account } from 'thirdweb/wallets'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EERC_ABI, USDC_ABI, YIELD_VAULT_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { deriveKeysFromUser, getDecryptedBalance } from '@/lib/crypto-utils'
import { chain } from '@/lib/environment/get-chain'
import { processPoseidonEncryption } from '@/lib/poseidon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WageGroup {
  id: string
  name: string
  yieldSource: string
  payees: Array<{
    email: string
    monthlyAmount: number
  }>
}

interface TopUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wageGroup: WageGroup | null
  account: Account | null
}

export function TopUpDialog({
  open,
  onOpenChange,
  wageGroup,
  account,
}: TopUpDialogProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    usdcDeposited: number
    sharesReceived?: number
    encryptedTokensReceived: number
  } | null>(null)

  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [thirdwebClient, setThirdwebClient] = useState<any>(null)

  useEffect(() => {
    const loadClient = async () => {
      try {
        const { thirdwebClient: client } = await import(
          '@/lib/clients/thirdweb-client'
        )
        setThirdwebClient(client)
        console.log('TopUpDialog: thirdwebClient loaded successfully')
      } catch (error) {
        console.error('TopUpDialog: Failed to load thirdweb client:', error)
      }
    }
    loadClient()
  }, [])

  // Memoize the USDC contract to prevent recreation
  const usdcContract = useMemo(() => {
    if (!thirdwebClient) return null
    console.log('TopUpDialog: Creating usdcContract')
    return getContract({
      client: thirdwebClient,
      chain,
      address: CONTRACT_ADDRESSES.USDC,
      abi: USDC_ABI,
    })
  }, [thirdwebClient])

  // Memoize the EERC contract
  const eercContract = useMemo(() => {
    if (!thirdwebClient) return null
    console.log('TopUpDialog: Creating eercContract')
    return getContract({
      client: thirdwebClient,
      chain,
      address: CONTRACT_ADDRESSES.EERC,
      abi: EERC_ABI,
    })
  }, [thirdwebClient])

  // Helper function to format USDC balance (6 decimals)
  const formatUsdcBalance = (balance: bigint) => {
    try {
      // Convert from wei to USDC (6 decimals)
      const divisor = BigInt(10 ** 6)
      const wholePart = balance / divisor
      const fractionalPart = balance % divisor

      // Convert to number for formatting
      const wholeNumber = Number(wholePart)
      const fractionalNumber = Number(fractionalPart) / 10 ** 6

      return wholeNumber + fractionalNumber
    } catch (error) {
      console.error('TopUpDialog: Error formatting USDC balance:', error)
      return 0
    }
  }

  // Fetch USDC balance function without timeout, matching FaucetPage
  const fetchUsdcBalance = useCallback(async () => {
    if (!account?.address || !usdcContract) {
      console.log('TopUpDialog: No active account address or usdcContract')
      setUsdcBalance(null)
      setBalanceError('No wallet connected')
      return
    }

    console.log('TopUpDialog: Fetching USDC balance for:', account.address)
    setBalanceLoading(true)
    setBalanceError(null)

    try {
      const balance = await balanceOf({
        contract: usdcContract,
        address: account.address,
      })
      console.log('TopUpDialog: Raw USDC balance fetched:', balance.toString())
      const formatted = formatUsdcBalance(balance)
      console.log('TopUpDialog: Formatted USDC balance:', formatted)

      setUsdcBalance(balance)
      setBalanceError(null)
    } catch (error) {
      console.error('TopUpDialog: Failed to fetch USDC balance:', error)
      setUsdcBalance(null)
      setBalanceError('Failed to load balance')
    } finally {
      setBalanceLoading(false)
    }
  }, [account?.address, usdcContract])

  // Only fetch balance when dialog opens and account is available
  useEffect(() => {
    console.log(
      'TopUpDialog: Dialog open state changed, open:',
      open,
      'account address:',
      account?.address
    )
    if (open && account?.address) {
      // Add a small delay to ensure wallet connection is fully established
      const timer = setTimeout(() => {
        console.log('TopUpDialog: Fetching balance after 500ms delay')
        fetchUsdcBalance()
      }, 500)

      return () => clearTimeout(timer)
    } else if (open && !account?.address) {
      console.log('TopUpDialog: Opened without connected account')
      setBalanceError('No wallet connected')
      setUsdcBalance(null)
    }
  }, [open, account?.address, fetchUsdcBalance])

  // Format USDC balance for display with error handling
  const formattedBalance = useMemo(() => {
    if (balanceError) return 'Error'
    if (usdcBalance === null) return '0.00'
    try {
      return formatUsdcBalance(usdcBalance).toFixed(2)
    } catch (error) {
      return 'Error'
    }
  }, [usdcBalance, balanceError])

  const calculateMonthlyTotal = () => {
    if (!wageGroup?.payees) return 0
    return wageGroup.payees.reduce((sum, payee) => sum + payee.monthlyAmount, 0)
  }

  const getVaultAddress = (yieldSource: string) => {
    switch (yieldSource) {
      case 're7-labs':
        return CONTRACT_ADDRESSES.VAULTS['re7-labs']
      case 'k3-capital':
        return CONTRACT_ADDRESSES.VAULTS['k3-capital']
      case 'mev-capital':
        return CONTRACT_ADDRESSES.VAULTS['mev-capital']
      default:
        return null
    }
  }

  // Helper function to deposit into EERC contract
  const depositIntoEERC = async (
    tokenToDeposit: any,
    depositAmount: bigint,
    tokenAddress: string
  ) => {
    if (!eercContract || !account) return null

    console.log('TopUpDialog: Starting EERC deposit process...')

    // Generate keys for the user using the account directly
    const { privateKey: userPrivateKey, publicKey: derivedPublicKey } =
      await deriveKeysFromUser(account.address, account)
    console.log('TopUpDialog: Generated keys for EERC deposit')

    // Generate amountPCT for auditing
    const depositAmountBigInt = BigInt(depositAmount.toString())
    const publicKeyBigInt = [derivedPublicKey[0], derivedPublicKey[1]]

    const {
      ciphertext: amountCiphertext,
      nonce: amountNonce,
      authKey: amountAuthKey,
    } = processPoseidonEncryption([depositAmountBigInt], publicKeyBigInt)

    // A Poseidon-Ciphertext (PCT) is a 7-element array composed of:
    // [ciphertext (4 elements), authKey (2 elements), nonce (1 element)]
    const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] =
      [
        ...amountCiphertext.slice(0, 4), // First 4 elements of ciphertext
        ...amountAuthKey, // Next 2 elements are the authKey
        amountNonce, // Final element is the nonce
      ] as [bigint, bigint, bigint, bigint, bigint, bigint, bigint]

    console.log('TopUpDialog: Generated amountPCT for EERC deposit')

    // Approve EERC contract to spend tokens
    console.log('TopUpDialog: Approving EERC contract to spend tokens...')
    const approveEERCTransaction = approve({
      contract: tokenToDeposit,
      spender: CONTRACT_ADDRESSES.EERC,
      amount: depositAmount.toString(),
    })

    await sendTransaction({
      transaction: approveEERCTransaction,
      account: account,
    })
    console.log('TopUpDialog: EERC approval successful')

    // Get encrypted balance before deposit
    let balanceBeforeDeposit = 0n
    try {
      const [eGCT, nonce, amountPCTs, balancePCT, transactionIndex] =
        await readContract({
          contract: eercContract,
          method: 'getBalanceFromTokenAddress',
          params: [account.address, tokenAddress],
        })

      const encryptedBalance = [
        [BigInt(eGCT.c1.x.toString()), BigInt(eGCT.c1.y.toString())],
        [BigInt(eGCT.c2.x.toString()), BigInt(eGCT.c2.y.toString())],
      ]
      const balancePCTArray = balancePCT.map((x: any) => BigInt(x.toString()))

      balanceBeforeDeposit = await getDecryptedBalance(
        userPrivateKey,
        [...amountPCTs],
        balancePCTArray,
        encryptedBalance
      )
      console.log(
        'TopUpDialog: Balance before EERC deposit:',
        balanceBeforeDeposit.toString()
      )
    } catch (error) {
      console.log('TopUpDialog: No existing EERC balance found (first deposit)')
    }

    // Deposit into EERC contract
    console.log('TopUpDialog: Depositing into EERC contract...')
    const eercDepositTransaction = prepareContractCall({
      contract: eercContract,
      method: 'deposit',
      params: [depositAmount, tokenAddress, amountPCT],
    })

    await sendTransaction({
      transaction: eercDepositTransaction,
      account: account,
    })
    console.log('TopUpDialog: EERC deposit successful')

    // Get encrypted balance after deposit to calculate received tokens
    let balanceAfterDeposit = 0n
    try {
      // Wait a bit for the transaction to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const [eGCT, nonce, amountPCTs, balancePCT, transactionIndex] =
        await readContract({
          contract: eercContract,
          method: 'getBalanceFromTokenAddress',
          params: [account.address, tokenAddress],
        })

      const encryptedBalance = [
        [BigInt(eGCT.c1.x.toString()), BigInt(eGCT.c1.y.toString())],
        [BigInt(eGCT.c2.x.toString()), BigInt(eGCT.c2.y.toString())],
      ]
      const balancePCTArray = balancePCT.map((x: any) => BigInt(x.toString()))

      balanceAfterDeposit = await getDecryptedBalance(
        userPrivateKey,
        [...amountPCTs], // Convert readonly array to mutable array
        balancePCTArray,
        encryptedBalance
      )
      console.log(
        'TopUpDialog: Balance after EERC deposit:',
        balanceAfterDeposit.toString()
      )
    } catch (error) {
      console.error(
        'TopUpDialog: Error getting balance after EERC deposit:',
        error
      )
    }

    const encryptedTokensReceived = balanceAfterDeposit - balanceBeforeDeposit
    console.log(
      'TopUpDialog: Encrypted tokens received:',
      encryptedTokensReceived.toString()
    )

    return Number(encryptedTokensReceived) / 1e2 // Convert from encrypted system decimals (2)
  }

  const handleTopUp = async () => {
    if (!wageGroup || !amount || parseFloat(amount) <= 0 || !account) return

    try {
      setIsLoading(true)

      const depositAmount = BigInt(Math.floor(parseFloat(amount) * 1e6))

      if (!usdcContract || !eercContract) {
        console.error('Contracts not initialized')
        return
      }

      let sharesReceived: number | undefined
      let encryptedTokensReceived: number

      if (wageGroup.yieldSource === 'none' || !wageGroup.yieldSource) {
        // Direct USDC deposit into EERC
        console.log('TopUpDialog: Direct USDC to EERC deposit')

        encryptedTokensReceived =
          (await depositIntoEERC(
            usdcContract,
            depositAmount,
            CONTRACT_ADDRESSES.USDC
          )) || 0
      } else {
        // Deposit into yield vault first, then into EERC
        const vaultAddress = getVaultAddress(wageGroup.yieldSource)
        if (!vaultAddress) {
          console.log('No yield source specified, skipping deposit')
          onOpenChange(false)
          return
        }

        console.log('TopUpDialog: Vault address:', vaultAddress)

        // Create vault contract
        const vaultContract = getContract({
          client: thirdwebClient,
          chain,
          address: vaultAddress,
          abi: YIELD_VAULT_ABI,
        })

        // Get vault shares balance before deposit
        const sharesBefore = await readContract({
          contract: vaultContract,
          method: 'balanceOf',
          params: [account.address],
        })

        // Step 1: Approve USDC spending for vault
        const approveTransaction = approve({
          contract: usdcContract,
          spender: vaultAddress,
          amount: amount,
        })

        const approvalTransactionReceipt = await sendTransaction({
          transaction: approveTransaction,
          account: account,
        })
        console.log(
          'TopUpDialog: Vault approval successful:',
          approvalTransactionReceipt
        )

        // Step 2: Deposit USDC into vault
        const depositTransaction = prepareContractCall({
          contract: vaultContract,
          method: 'deposit',
          params: [depositAmount, account.address],
        })

        const depositTransactionReceipt = await sendTransaction({
          transaction: depositTransaction,
          account: account,
        })
        console.log(
          'TopUpDialog: Vault deposit successful:',
          depositTransactionReceipt
        )

        // Get vault shares balance after deposit
        const sharesAfter = await readContract({
          contract: vaultContract,
          method: 'balanceOf',
          params: [account.address],
        })

        const sharesReceivedBigInt = sharesAfter - sharesBefore
        sharesReceived = Number(sharesReceivedBigInt) / 1e6 // Assuming 6 decimals for vault shares
        console.log('TopUpDialog: Shares received:', sharesReceived)

        // Step 3: Deposit vault shares into EERC
        console.log('TopUpDialog: Depositing vault shares into EERC...')

        encryptedTokensReceived =
          (await depositIntoEERC(
            vaultContract,
            sharesReceivedBigInt,
            vaultAddress
          )) || 0
      }

      // Store success data
      setSuccessData({
        usdcDeposited: parseFloat(amount),
        sharesReceived,
        encryptedTokensReceived,
      })

      // Show success state
      setShowSuccess(true)

      // Reset form
      setAmount('')

      // Refresh balance after successful transaction
      setTimeout(() => {
        fetchUsdcBalance()
      }, 2000)

      // Close dialog after showing success message
      setTimeout(() => {
        setShowSuccess(false)
        setSuccessData(null)
        onOpenChange(false)
      }, 3000) // Increased timeout to show more details
    } catch (error) {
      console.error('TopUpDialog: Error during top-up:', error)
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshBalance = () => {
    if (!account?.address) {
      setBalanceError('No wallet connected')
      return
    }
    console.log('TopUpDialog: Manual balance refresh triggered')
    fetchUsdcBalance()
  }

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setShowSuccess(false)
      setSuccessData(null)
      setAmount('')
      // Reset balance state when dialog closes to prevent stale data
      setUsdcBalance(null)
      setBalanceError(null)
    }
  }, [open])

  if (!open || !wageGroup) return null

  const monthlyTotal = calculateMonthlyTotal()
  const suggestedAmounts = [
    { months: 1, amount: monthlyTotal },
    { months: 2, amount: monthlyTotal * 2 },
    { months: 3, amount: monthlyTotal * 3 },
    { months: 6, amount: monthlyTotal * 6 },
  ]

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 relative border border-purple-100/50 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 h-8 w-8 p-0 text-purple-400 hover:text-purple-600 hover:bg-purple-100/50 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>

        {showSuccess ? (
          // Success State
          <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-4 mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-purple-900 mb-4 text-center">
              Successfully Added Funds!
            </h3>
            {successData && (
              <div className="text-center space-y-2">
                <p className="text-purple-600/70">
                  Deposited:{' '}
                  <span className="font-semibold">
                    ${successData.usdcDeposited.toFixed(2)} USDC
                  </span>
                </p>
                {successData.sharesReceived && (
                  <p className="text-purple-600/70">
                    Vault Shares Received:{' '}
                    <span className="font-semibold">
                      {successData.sharesReceived.toFixed(2)}
                    </span>
                  </p>
                )}
                <p className="text-purple-600/70">
                  Encrypted Tokens Received:{' '}
                  <span className="font-semibold">
                    {successData.encryptedTokensReceived.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-200 rounded-t-lg p-6 pr-12">
              <div className="mx-auto bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-3 w-fit mb-4">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-purple-900 text-center">
                Add Funds to {wageGroup.name}
              </h2>
              <p className="text-purple-600/70 text-center mt-2">
                Top up your payment group account with USDC
                {wageGroup.yieldSource !== 'none' &&
                  wageGroup.yieldSource &&
                  ` via ${wageGroup.yieldSource} yield vault`}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Monthly Total Info */}
                <div className="bg-purple-50/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-600 mb-1">
                    Monthly Payment Total
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {monthlyTotal.toFixed(2)} USDC
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    {wageGroup.payees.length} team member
                    {wageGroup.payees.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-purple-700 font-medium"
                  >
                    Top Up Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="border-purple-200 focus:border-purple-400 focus:ring-purple-400 text-lg"
                  />

                  {/* Wallet Balance Display with improved error handling */}
                  <div className="flex items-center justify-between text-sm text-purple-600 mt-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-purple-500" />
                      <span>
                        Wallet Balance:{' '}
                        {balanceLoading ? (
                          <span className="text-purple-500">Loading...</span>
                        ) : balanceError ? (
                          <span className="text-red-500 text-xs">
                            {balanceError}
                          </span>
                        ) : account?.address ? (
                          `${formattedBalance} USDC`
                        ) : (
                          <span className="text-orange-500">
                            No wallet connected
                          </span>
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshBalance}
                      disabled={balanceLoading}
                      className="h-6 w-6 p-0 text-purple-500 hover:text-purple-600"
                      title={
                        balanceError || !account?.address
                          ? 'Check wallet connection'
                          : 'Refresh balance'
                      }
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="space-y-2">
                  <Label className="text-purple-700 font-medium text-sm">
                    Quick Amounts
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestedAmounts.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(suggestion.amount.toString())}
                        className="border-purple-200 text-purple-700 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300"
                        disabled={isLoading}
                      >
                        {suggestion.amount.toFixed(0)} USDC
                        <span className="text-xs ml-1">
                          ({suggestion.months} month
                          {suggestion.months !== 1 ? 's' : ''})
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-6">
                <Button
                  onClick={handleTopUp}
                  disabled={
                    isLoading ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    !account?.address
                  }
                  className="bg-gradient-to-r w-full from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {wageGroup.yieldSource !== 'none' && wageGroup.yieldSource
                        ? 'Processing via Yield Vault & Encryption...'
                        : 'Processing Encrypted Deposit...'}
                    </>
                  ) : !account?.address ? (
                    'Connect Wallet First'
                  ) : (
                    `Add ${amount || '0'} USDC`
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
