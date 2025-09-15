'use client'

import {
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
} from 'thirdweb'
import { approve, balanceOf } from 'thirdweb/extensions/erc20'
import { Account } from 'thirdweb/wallets'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EERC_ABI,
  REGISTRAR_ABI,
  USDC_ABI,
  YIELD_VAULT_ABI,
} from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { deriveKeysFromUser, getDecryptedBalance } from '@/lib/crypto-utils'
import { chain } from '@/lib/environment/get-chain'
import { processPoseidonEncryption } from '@/lib/poseidon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePrivateTransfer } from '@/hooks/use-private-transfer'
import { useSafeEercRegistration } from '@/hooks/use-safe-eerc-registration'

interface WageGroup {
  id: string
  name: string
  startDate: string
  paymentDate: number
  yieldSource: string
  eercRegistered: boolean
  isActive: boolean
  safeWalletAddress?: string
  payees: Array<{
    email: string
    monthlyAmount: number
  }>
}

interface WalletData {
  owners: Array<{
    email: string
    accepted: boolean
    isCurrentUser: boolean
    userId?: string
  }>
  pendingInvites: Array<{
    email: string
    accepted: boolean
  }>
  threshold: number | null
  safeWalletAddress: string | null
}

interface WalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wageGroup: WageGroup | null
  account: Account | null
  onWageGroupUpdate?: (updatedWageGroup: WageGroup) => void
}

interface DepositProgress {
  currentStep: number
  totalSteps: number
  stepMessages: string[]
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

export function WalletDialog({
  open,
  onOpenChange,
  wageGroup,
  account,
  onWageGroupUpdate,
}: WalletDialogProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    usdcDeposited: number
    sharesReceived?: number
    encryptedTokensReceived: number
  } | null>(null)
  const [walletSuccessMessage, setWalletSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState('topup')

  // Progress tracking state
  const [depositProgress, setDepositProgress] = useState<DepositProgress>({
    currentStep: 0,
    totalSteps: 0,
    stepMessages: [],
  })

  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [thirdwebClient, setThirdwebClient] = useState<any>(null)

  // Wallet settings state
  const [includeSelf, setIncludeSelf] = useState(true)
  const [ownerEmails, setOwnerEmails] = useState<string[]>([''])
  const [threshold, setThreshold] = useState(1)
  const [isCreatingWallet, setIsCreatingWallet] = useState(false)
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [isLoadingWalletData, setIsLoadingWalletData] = useState(false)
  const [showSafeEercSuccess, setShowSafeEercSuccess] = useState(false)

  // Improved fetch tracking to prevent infinite loops
  const fetchInProgressRef = useRef(false)
  const lastSuccessfulFetchRef = useRef<string>('')
  const successHandledRef = useRef(false)

  // Safe eERC registration hook
  const {
    registerSafeEerc,
    isPending: isSafeEercPending,
    isPreparingProof: isSafePreparingProof,
    isProposing: isSafeProposing,
    isWaitingSignatures: isSafeWaitingSignatures,
    isExecuting: isSafeExecuting,
    isConfirmed: isSafeConfirmed,
    error: safeEercError,
    safeTxHash,
    pendingSignatures,
  } = useSafeEercRegistration({
    wageGroupId: wageGroup?.id || '',
    safeWalletAddress:
      walletData?.safeWalletAddress || wageGroup?.safeWalletAddress || '',
    threshold: walletData?.threshold || 1,
  })

  useEffect(() => {
    const loadClient = async () => {
      try {
        const { thirdwebClient: client } = await import(
          '@/lib/clients/thirdweb-client'
        )
        setThirdwebClient(client)
        console.log('WalletDialog: thirdwebClient loaded successfully')
      } catch (error) {
        console.error('WalletDialog: Failed to load thirdweb client:', error)
      }
    }
    loadClient()
  }, [])

  // Handle Safe eERC registration success - FIXED to prevent infinite loops
  useEffect(() => {
    if (isSafeConfirmed && wageGroup && !successHandledRef.current) {
      console.log(
        'WalletDialog: Safe eERC registration confirmed, handling success...'
      )
      successHandledRef.current = true

      setShowSafeEercSuccess(true)

      // Update the wage group's eERC status immediately
      const updatedWageGroup = {
        ...wageGroup,
        eercRegistered: true,
      }

      // Notify parent component of the update
      if (onWageGroupUpdate) {
        onWageGroupUpdate(updatedWageGroup)
      }

      // Schedule a single wallet data refresh after a delay
      const refreshTimeout = setTimeout(() => {
        console.log(
          'WalletDialog: Refreshing wallet data after registration success'
        )
        fetchWalletData()
      }, 1000)

      // Hide success message after delay
      const hideTimeout = setTimeout(() => {
        setShowSafeEercSuccess(false)
      }, 3000)

      return () => {
        clearTimeout(refreshTimeout)
        clearTimeout(hideTimeout)
      }
    }
  }, [isSafeConfirmed, wageGroup, onWageGroupUpdate])

  // Calculate total owners and update threshold if it exceeds maximum
  useEffect(() => {
    const validEmails = ownerEmails.filter((email) => email.trim() !== '')
    const totalOwners = (includeSelf ? 1 : 0) + validEmails.length
    const maxThreshold = Math.max(1, totalOwners)

    // Only update threshold if it exceeds the new maximum
    if (threshold > maxThreshold) {
      setThreshold(maxThreshold)
    }
  }, [includeSelf, ownerEmails, threshold])

  // UPDATED: Remove tokenAddress from the hook initialization
  const {
    transfer: executePrivateTransfer,
    isPending: isTransferPending,
    isPreparingTransfer,
    isGeneratingProof,
    isWritePending: isTransferWritePending,
    isConfirming: isTransferConfirming,
    isConfirmed: isTransferConfirmed,
    error: transferError,
    hash: transferHash,
  } = usePrivateTransfer({
    safeWalletAddress: wageGroup?.safeWalletAddress || '',
  })

  // Helper function to initialize progress steps
  const initializeProgress = (hasYieldSource: boolean) => {
    if (hasYieldSource) {
      setDepositProgress({
        currentStep: 0,
        totalSteps: 5,
        stepMessages: [
          'Initiating USDC transfer',
          'Depositing into yield vault',
          'Encrypting yield shares',
          'Finalising deposit',
          'Deposit complete',
        ],
      })
    } else {
      setDepositProgress({
        currentStep: 0,
        totalSteps: 4,
        stepMessages: [
          'Initiating USDC transfer',
          'Encrypting USDC',
          'Finalising deposit',
          'Deposit complete',
        ],
      })
    }
  }

  // Helper function to advance progress
  const advanceProgress = () => {
    setDepositProgress((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps),
    }))
  }

  // Improved fetchWalletData with better duplicate prevention
  const fetchWalletData = useCallback(async () => {
    if (!wageGroup?.id || fetchInProgressRef.current) {
      console.log(
        'WalletDialog: Skipping fetch - no wage group or fetch in progress'
      )
      return
    }

    const fetchKey = `${wageGroup.id}-${Date.now()}`

    // Prevent rapid successive calls
    if (
      lastSuccessfulFetchRef.current &&
      Date.now() -
        parseInt(lastSuccessfulFetchRef.current.split('-').pop() || '0') <
        2000
    ) {
      console.log(
        'WalletDialog: Skipping fetch - too soon after last successful fetch'
      )
      return
    }

    fetchInProgressRef.current = true
    setIsLoadingWalletData(true)

    try {
      console.log('WalletDialog: Fetching wallet data for', wageGroup.id)
      const response = await fetch(`/api/wallet?wageGroupId=${wageGroup.id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setWalletData(result.data)
          lastSuccessfulFetchRef.current = fetchKey
          console.log('WalletDialog: Successfully fetched wallet data')
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setIsLoadingWalletData(false)
      fetchInProgressRef.current = false
    }
  }, [wageGroup?.id])

  // Simplified effect for wallet data fetching - only trigger on dialog open and tab change
  useEffect(() => {
    if (
      open &&
      wageGroup?.id &&
      (activeTab === 'settings' || activeTab === 'topup')
    ) {
      // Add delay to prevent rapid calls during tab switches
      const timeoutId = setTimeout(() => {
        fetchWalletData()
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [open, wageGroup?.id, activeTab, fetchWalletData])

  // Memoize the USDC contract to prevent recreation
  const usdcContract = useMemo(() => {
    if (!thirdwebClient) return null
    console.log('WalletDialog: Creating usdcContract')
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
    console.log('WalletDialog: Creating eercContract')
    return getContract({
      client: thirdwebClient,
      chain,
      address: CONTRACT_ADDRESSES.EERC,
      abi: EERC_ABI,
    })
  }, [thirdwebClient])

  // Memoize the Registrar contract
  const registrarContract = useMemo(() => {
    if (!thirdwebClient) return null
    console.log('WalletDialog: Creating registrarContract')
    return getContract({
      client: thirdwebClient,
      chain,
      address: CONTRACT_ADDRESSES.REGISTRAR,
      abi: REGISTRAR_ABI,
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
      console.error('WalletDialog: Error formatting USDC balance:', error)
      return 0
    }
  }

  // Fetch USDC balance function without timeout, matching FaucetPage
  const fetchUsdcBalance = useCallback(async () => {
    if (!account?.address || !usdcContract) {
      console.log('WalletDialog: No active account address or usdcContract')
      setUsdcBalance(null)
      setBalanceError('No wallet connected')
      return
    }

    console.log('WalletDialog: Fetching USDC balance for:', account.address)
    setBalanceLoading(true)
    setBalanceError(null)

    try {
      const balance = await balanceOf({
        contract: usdcContract,
        address: account.address,
      })
      console.log('WalletDialog: Raw USDC balance fetched:', balance.toString())
      const formatted = formatUsdcBalance(balance)
      console.log('WalletDialog: Formatted USDC balance:', formatted)

      setUsdcBalance(balance)
      setBalanceError(null)
    } catch (error) {
      console.error('WalletDialog: Failed to fetch USDC balance:', error)
      setUsdcBalance(null)
      setBalanceError('Failed to load balance')
    } finally {
      setBalanceLoading(false)
    }
  }, [account?.address, usdcContract])

  // Only fetch balance when dialog opens and account is available
  useEffect(() => {
    console.log(
      'WalletDialog: Dialog open state changed, open:',
      open,
      'account address:',
      account?.address
    )
    if (open && account?.address) {
      // Add a small delay to ensure wallet connection is fully established
      const timer = setTimeout(() => {
        console.log('WalletDialog: Fetching balance after 500ms delay')
        fetchUsdcBalance()
      }, 500)

      return () => clearTimeout(timer)
    } else if (open && !account?.address) {
      console.log('WalletDialog: Opened without connected account')
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

  // Helper function to deposit into EERC contract
  const depositIntoEERC = async (
    tokenToDeposit: any,
    depositAmount: bigint,
    tokenAddress: string
  ) => {
    if (!eercContract || !account) return null

    console.log('WalletDialog: Starting EERC deposit process...')

    // Generate keys for the user using the account directly
    const { privateKey: userPrivateKey, publicKey: derivedPublicKey } =
      await deriveKeysFromUser(account.address, account)
    console.log('WalletDialog: Generated keys for EERC deposit')

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

    console.log(
      'WalletDialog: Generated amountPCT for EERC deposit:',
      amountPCT
    )

    // Approve EERC contract to spend tokens
    console.log('WalletDialog: Approving EERC contract to spend tokens...')
    const approveEERCTransaction = approve({
      contract: tokenToDeposit,
      spender: CONTRACT_ADDRESSES.EERC,
      amount: depositAmount.toString(),
    })

    await sendTransaction({
      transaction: approveEERCTransaction,
      account: account,
    })
    console.log('WalletDialog: EERC approval successful')

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

      advanceProgress()

      balanceBeforeDeposit = await getDecryptedBalance(
        userPrivateKey,
        [...amountPCTs],
        balancePCTArray,
        encryptedBalance
      )
      console.log(
        'WalletDialog: Balance before EERC deposit:',
        balanceBeforeDeposit.toString()
      )
    } catch (error) {
      console.log(
        'WalletDialog: No existing EERC balance found (first deposit)'
      )
    }

    // Deposit into EERC contract
    console.log('WalletDialog: Depositing into EERC contract...')
    const eercDepositTransaction = prepareContractCall({
      contract: eercContract,
      method: 'deposit',
      params: [depositAmount, tokenAddress, amountPCT],
    })

    await sendTransaction({
      transaction: eercDepositTransaction,
      account: account,
    })
    console.log('WalletDialog: EERC deposit successful')

    // Get encrypted balance after deposit to calculate received tokens
    let balanceAfterDeposit = 0n
    try {
      // Wait a bit for the transaction to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log('tokenAddress_reading_in_WalletDialog:', tokenAddress)
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
        'WalletDialog: Balance after EERC deposit:',
        balanceAfterDeposit.toString()
      )
    } catch (error) {
      console.error(
        'WalletDialog: Error getting balance after EERC deposit:',
        error
      )
    }

    const encryptedTokensReceived = balanceAfterDeposit - balanceBeforeDeposit
    console.log(
      'WalletDialog: Encrypted tokens received:',
      encryptedTokensReceived.toString()
    )

    return {
      encryptedTokensReceived: Number(encryptedTokensReceived) / 1e2, // Convert from encrypted system decimals (2)
      tokenAddress,
    }
  }

  const handleTopUp = async () => {
    if (!wageGroup || !amount || parseFloat(amount) <= 0 || !account) return

    try {
      setIsLoading(true)

      const hasYieldSource =
        wageGroup.yieldSource && wageGroup.yieldSource !== 'none'
      initializeProgress(!!hasYieldSource)

      const depositAmount = BigInt(Math.floor(parseFloat(amount) * 1e6))

      if (!usdcContract || !eercContract) {
        console.error('Contracts not initialized')
        return
      }

      let sharesReceived: number | undefined
      let encryptedTokensReceived: number

      // Step 1: Initiating USDC transfer
      advanceProgress()

      if (!hasYieldSource) {
        // Direct USDC deposit into EERC
        console.log('WalletDialog: Direct USDC to EERC deposit')

        // Step 2: Encrypting USDC
        advanceProgress()

        const depositResult = await depositIntoEERC(
          usdcContract,
          depositAmount,
          CONTRACT_ADDRESSES.USDC
        )

        console.log('Deposit USDC into EERC successful!')

        if (!depositResult) {
          throw new Error('Failed to deposit into EERC')
        }

        encryptedTokensReceived = depositResult.encryptedTokensReceived

        // Step 3: Finalising deposit
        // advanceProgress()
      } else {
        // Deposit into yield vault first, then into EERC
        const vaultAddress = getVaultAddress(wageGroup.yieldSource)
        if (!vaultAddress) {
          console.log('No yield source specified, skipping deposit')
          onOpenChange(false)
          return
        }

        console.log('WalletDialog: Vault address:', vaultAddress)

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

        // Approve USDC spending for vault
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
          'WalletDialog: Vault approval successful:',
          approvalTransactionReceipt
        )

        // Step 2: Depositing into yield vault
        advanceProgress()

        // Deposit USDC into vault
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
          'WalletDialog: Vault deposit successful:',
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
        console.log('WalletDialog: Shares received:', sharesReceived)

        // Step 3: Encrypting yield shares
        advanceProgress()

        console.log('WalletDialog: Depositing vault shares into EERC...')

        const depositResult = await depositIntoEERC(
          vaultContract,
          sharesReceivedBigInt,
          vaultAddress
        )

        if (!depositResult) {
          throw new Error('Failed to deposit vault shares into EERC')
        }

        encryptedTokensReceived = depositResult.encryptedTokensReceived

        // Step 4: Finalising deposit
        // advanceProgress()
      }

      // Final step: Deposit complete
      advanceProgress()

      // Store success data for top-up
      setSuccessData({
        usdcDeposited: parseFloat(amount),
        sharesReceived,
        encryptedTokensReceived,
      })
      setWalletSuccessMessage('') // Clear wallet success message for top-up

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
      }, 4000)
    } catch (error) {
      console.error('WalletDialog: Error during top-up:', error)
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsLoading(false)
      setDepositProgress({
        currentStep: 0,
        totalSteps: 0,
        stepMessages: [],
      })
    }
  }

  // Wallet settings functions
  const addOwnerEmail = () => {
    setOwnerEmails([...ownerEmails, ''])
  }

  const removeOwnerEmail = (index: number) => {
    if (ownerEmails.length > 1) {
      setOwnerEmails(ownerEmails.filter((_, i) => i !== index))
    }
  }

  const updateOwnerEmail = (index: number, value: string) => {
    const updated = [...ownerEmails]
    updated[index] = value
    setOwnerEmails(updated)
  }

  const getTotalOwners = () => {
    const validEmails = ownerEmails.filter((email) => email.trim() !== '')
    return (includeSelf ? 1 : 0) + validEmails.length
  }

  const getMaxThreshold = () => {
    return Math.max(1, getTotalOwners())
  }

  const validateWalletForm = () => {
    const totalOwners = getTotalOwners()
    if (totalOwners === 0) return false
    if (threshold < 1 || threshold > totalOwners) return false

    // Check for duplicate emails
    const validEmails = ownerEmails.filter((email) => email.trim() !== '')
    const uniqueEmails = new Set(validEmails)
    if (validEmails.length !== uniqueEmails.size) return false

    return true
  }

  const handleCreateWallet = async () => {
    if (!validateWalletForm() || !wageGroup?.id || !account) return

    setIsCreatingWallet(true)
    try {
      // Get user signature for address derivation
      const message = `Creating Safe wallet for wage group`
      const userSignature = await account.signMessage({ message })

      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wageGroupId: wageGroup.id,
          includeSelf,
          ownerEmails: ownerEmails.filter((email) => email.trim() !== ''),
          threshold,
          userSignature,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setIncludeSelf(true)
        setOwnerEmails([''])
        setThreshold(1)

        // Determine success message based on wallet creation type
        const totalOwners = getTotalOwners()
        if (totalOwners === 1) {
          setWalletSuccessMessage('Wage Group Wallet Created')
        } else {
          setWalletSuccessMessage('Wage Group Wallet Initiated')
        }

        // Show success message briefly
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)

        // Automatically route to Top Up page after wallet creation
        setTimeout(() => {
          setActiveTab('topup')
          // Clear fetch tracking to allow fresh fetch
          lastSuccessfulFetchRef.current = ''
        }, 2000)
      } else {
        console.error('Failed to create wallet:', result.error)
        // TODO: Add error handling/toast notification
      }
    } catch (error) {
      console.error('Error creating wallet:', error)
      // TODO: Add error handling/toast notification
    } finally {
      setIsCreatingWallet(false)
    }
  }

  const handleRefreshBalance = () => {
    if (!account?.address) {
      setBalanceError('No wallet connected')
      return
    }
    console.log('WalletDialog: Manual balance refresh triggered')
    fetchUsdcBalance()
  }

  const handleGoToSettings = () => {
    setActiveTab('settings')
  }

  const handleSafeEercRegistration = async () => {
    try {
      await registerSafeEerc()
    } catch (error) {
      console.error('Error during Safe eERC registration:', error)
    }
  }

  // Reset states when dialog closes - IMPROVED to reset all tracking refs
  useEffect(() => {
    if (!open) {
      console.log('WalletDialog: Dialog closing, resetting all state...')
      setShowSuccess(false)
      setSuccessData(null)
      setWalletSuccessMessage('')
      setAmount('')
      setActiveTab('topup')
      setShowSafeEercSuccess(false)
      // Reset balance state when dialog closes to prevent stale data
      setUsdcBalance(null)
      setBalanceError(null)
      // Reset settings form
      setIncludeSelf(true)
      setOwnerEmails([''])
      setThreshold(1)
      // Reset progress state
      setDepositProgress({
        currentStep: 0,
        totalSteps: 0,
        stepMessages: [],
      })
      // Reset ALL tracking refs to prevent lingering state
      fetchInProgressRef.current = false
      lastSuccessfulFetchRef.current = ''
      successHandledRef.current = false
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

  const hasWallet = Boolean(
    wageGroup.safeWalletAddress || walletData?.safeWalletAddress
  )

  return (
    <div className="fixed top-[0.01%] bottom-[0.01%] left-0 right-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 relative border border-purple-100/50 shadow-2xl h-full max-h-[800px] flex flex-col">
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
          <div className="flex flex-col items-center justify-center flex-1 px-6">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-4 mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-purple-900 mb-4 text-center">
              {walletSuccessMessage || 'Successfully Added Funds!'}
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
        ) : isLoading ? (
          // Loading State with Progress Bar
          <div className="flex flex-col items-center justify-center flex-1 px-6">
            <div className="bg-gradient-to-r from-purple-400 to-violet-500 rounded-full p-4 mb-6 shadow-lg">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-semibold text-purple-900 mb-6 text-center">
              Processing Deposit
            </h3>

            {/* Progress Bar */}
            <div className="w-full max-w-sm space-y-4">
              <Progress
                value={
                  (depositProgress.currentStep / depositProgress.totalSteps) *
                  100
                }
                className="h-3 bg-purple-100 [&>div]:bg-violet-300"
              />

              {/* Current Step Display */}
              <div className="text-center">
                <p className="text-purple-700 font-medium">
                  Step {depositProgress.currentStep} of{' '}
                  {depositProgress.totalSteps}
                </p>
                <p className="text-purple-600/70 text-sm mt-1">
                  {depositProgress.stepMessages[
                    depositProgress.currentStep - 1
                  ] || 'Preparing...'}
                </p>
              </div>

              {/* Step List */}
              <div className="space-y-2">
                {depositProgress.stepMessages.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      index < depositProgress.currentStep
                        ? 'text-green-600'
                        : index === depositProgress.currentStep - 1
                          ? 'text-purple-700 font-medium'
                          : 'text-purple-400'
                    }`}
                  >
                    {index < depositProgress.currentStep ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : index === depositProgress.currentStep - 1 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-purple-300" />
                    )}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-200 rounded-t-lg p-6 pr-12 flex-shrink-0">
              <div className="mx-auto bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-3 w-fit mb-4">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-purple-900 text-center">
                Wallet for {wageGroup.name}
              </h2>
              <p className="text-purple-600/70 text-center mt-2">
                Manage your payment group wallet
              </p>
            </div>

            {/* Content with Tabs */}
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6 flex-shrink-0">
                  <TabsTrigger value="topup" className="text-sm">
                    Top Up
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-sm">
                    Settings
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                  <TabsContent value="topup" className="space-y-6 m-0">
                    {!hasWallet ? (
                      // No wallet setup yet
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Settings className="h-8 w-8 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Set up wallet first
                        </h3>
                        <p className="text-gray-500 mb-6">
                          You need to configure your wallet before you can add
                          funds.
                        </p>
                        <Button
                          onClick={handleGoToSettings}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        >
                          Go to Settings
                        </Button>
                      </div>
                    ) : hasWallet && !wageGroup.eercRegistered ? (
                      // Wallet exists but not eERC registered
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Shield className="h-8 w-8 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Wage group wallet not registered
                        </h3>
                        <p className="text-gray-500 mb-6">
                          The wallet needs to be registered for encrypted
                          transactions before you can add funds.
                        </p>
                        <Button
                          onClick={handleGoToSettings}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        >
                          Go to Settings
                        </Button>
                      </div>
                    ) : (
                      // Wallet exists and is eERC registered - show normal top up form
                      <>
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
                                  <span className="text-purple-500">
                                    Loading...
                                  </span>
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
                                onClick={() =>
                                  setAmount(suggestion.amount.toString())
                                }
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
                                Processing...
                              </>
                            ) : !account?.address ? (
                              'Connect Wallet First'
                            ) : (
                              `Add ${amount || '0'} USDC`
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-6 m-0">
                    {isLoadingWalletData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : hasWallet ? (
                      // Wallet already exists - show current status
                      <div className="space-y-6">
                        {/* Safe eERC Registration Success Message */}
                        {showSafeEercSuccess && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <h3 className="font-medium text-green-800">
                                eERC Registration Complete!
                              </h3>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              Your Safe wallet can now use encrypted tokens.
                            </p>
                          </div>
                        )}

                        {/* Wallet Status */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-green-600" />
                            <h3 className="font-medium text-green-800">
                              Multi-Signature Wallet Active
                            </h3>
                          </div>
                          <p className="text-sm text-green-700 mb-2">
                            Safe Address:{' '}
                            {wageGroup.safeWalletAddress ||
                              walletData?.safeWalletAddress}
                          </p>
                          {walletData?.threshold && (
                            <p className="text-sm text-green-700">
                              Signature Threshold: {walletData.threshold} of{' '}
                              {walletData.owners.length +
                                walletData.pendingInvites.length}{' '}
                              {walletData.owners.length +
                                walletData.pendingInvites.length ===
                              1
                                ? 'owner'
                                : 'owners'}
                            </p>
                          )}
                          {/* eERC Registration Section */}
                          <div className="border-t mt-6 border-gray-200 pt-4">
                            <div className="flex items-center justify-between mb-2 mr-4">
                              <div className="flex items-center gap-2"></div>
                              {wageGroup.eercRegistered ? (
                                <div className="flex items-center space-x-1 text-green-600 bg-green-200 px-3 py-1.5 rounded-md">
                                  <ShieldCheck className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    eERC Registered
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <Button
                                    onClick={handleSafeEercRegistration}
                                    disabled={
                                      isSafeEercPending ||
                                      !walletData?.safeWalletAddress
                                    }
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                                    size="sm"
                                  >
                                    {isSafeEercPending ? (
                                      <span className="flex items-center">
                                        <Loader2 className="animate-spin mr-2 h-3 w-3" />
                                        {isSafePreparingProof &&
                                          'Generating Proof...'}
                                        {isSafeProposing &&
                                          'Proposing Transaction...'}
                                        {isSafeWaitingSignatures &&
                                          `Waiting for ${pendingSignatures} signatures...`}
                                        {isSafeExecuting && 'Executing...'}
                                      </span>
                                    ) : (
                                      <>
                                        <Shield className="h-3 w-3 mr-1" />
                                        Register eERC
                                      </>
                                    )}
                                  </Button>
                                  <p className="text-xs mt-2 text-gray-500">
                                    Register your wallet to start encrypted
                                    token transactions
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Registration Status Details */}
                            {isSafeEercPending && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                                <div className="space-y-2">
                                  {isSafePreparingProof && (
                                    <div className="flex items-center gap-2 text-purple-700">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm">
                                        Generating zero-knowledge proof...
                                      </span>
                                    </div>
                                  )}
                                  {isSafeProposing && (
                                    <div className="flex items-center gap-2 text-purple-700">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm">
                                        Proposing transaction to create Safe
                                        wallet...
                                      </span>
                                    </div>
                                  )}
                                  {isSafeWaitingSignatures && (
                                    <div className="flex items-center gap-2 text-orange-700">
                                      <Clock className="h-4 w-4" />
                                      <span className="text-sm">
                                        Waiting for {pendingSignatures} more
                                        signature
                                        {pendingSignatures !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}
                                  {isSafeExecuting && (
                                    <div className="flex items-center gap-2 text-purple-700">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-sm">
                                        Completing transaction...
                                      </span>
                                    </div>
                                  )}
                                  {safeTxHash && (
                                    <div className="mt-2">
                                      <p className="text-xs text-purple-600 font-medium">
                                        Safe Transaction Hash:
                                      </p>
                                      <p className="text-xs font-mono text-purple-500 break-all">
                                        {safeTxHash}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Error Display */}
                            {safeEercError && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-red-700">
                                  Registration failed: {safeEercError.message}
                                </p>
                              </div>
                            )}

                            <p className="text-sm text-gray-600">
                              {walletData?.threshold &&
                                walletData.threshold > 1 && (
                                  <span className="block mt-1 text-purple-600">
                                    Requires {walletData.threshold} signature
                                    {walletData.threshold !== 1 ? 's' : ''} to
                                    complete.
                                  </span>
                                )}
                            </p>
                          </div>
                        </div>

                        {/* Current Owners */}
                        {walletData?.owners && walletData.owners.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-purple-700 font-medium">
                              Current Owners
                            </Label>
                            {walletData.owners.map((owner, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-purple-500" />
                                  <span className="text-sm">
                                    {owner.email}
                                    {owner.isCurrentUser && (
                                      <span className="text-purple-600 ml-1">
                                        (You)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {owner.accepted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {owner.accepted ? 'Active' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pending Invites */}
                        {walletData?.pendingInvites &&
                          walletData.pendingInvites.length > 0 && (
                            <div className="space-y-3">
                              <Label className="text-purple-700 font-medium">
                                Pending Invitations
                              </Label>
                              {walletData.pendingInvites.map(
                                (invite, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-orange-500" />
                                      <span className="text-sm">
                                        {invite.email}
                                      </span>
                                    </div>
                                    <span className="text-xs text-orange-600">
                                      Awaiting response
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    ) : (
                      // No wallet yet - show creation form
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Create Wallet
                          </h3>
                          <p className="text-gray-500 text-sm">
                            Set up a secure multi-signature wallet for your wage
                            group
                          </p>
                        </div>

                        {/* Include Self Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeSelf"
                            checked={includeSelf}
                            onCheckedChange={(checked) =>
                              setIncludeSelf(checked as boolean)
                            }
                            className="data-[state=checked]:bg-purple-300 data-[state=checked]:border-purple-300"
                          />
                          <Label
                            htmlFor="includeSelf"
                            className="text-purple-700 font-medium"
                          >
                            Include myself as owner
                          </Label>
                        </div>

                        {/* Owner Emails Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-purple-700 font-medium">
                              Additional Owners
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addOwnerEmail}
                              className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Owner
                            </Button>
                          </div>

                          {ownerEmails.map((email, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                  updateOwnerEmail(index, e.target.value)
                                }
                                placeholder="owner@example.com"
                                className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                              />
                              {ownerEmails.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOwnerEmail(index)}
                                  className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Threshold Section */}
                        <div className="space-y-2">
                          <Label className="text-purple-700 font-medium">
                            Signatures Required for Transactions
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max={getMaxThreshold()}
                            value={threshold}
                            onChange={(e) => {
                              const value = parseInt(e.target.value)
                              if (value >= 1 && value <= getMaxThreshold()) {
                                setThreshold(value)
                              }
                            }}
                            className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                          <p className="text-xs text-purple-600">
                            Max: {getMaxThreshold()}
                          </p>
                        </div>

                        {/* Summary */}
                        <div className="bg-purple-50 rounded-lg p-4">
                          <h4 className="font-medium text-purple-900 mb-2">
                            Summary
                          </h4>
                          <ul className="text-sm text-purple-700 space-y-1">
                            <li>• Number of owners: {getTotalOwners()}</li>
                            <li>• Signatures required: {threshold}</li>
                            {getTotalOwners() === 1 && (
                              <li className="text-purple-700 font-semibold">
                                • Single owner - Wallet will be created
                                immediately
                              </li>
                            )}
                            {getTotalOwners() > 1 && (
                              <li className="text-purple-700 font-semibold">
                                • Invitations will be sent to other owners
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Create Wallet Button */}
                        <Button
                          onClick={handleCreateWallet}
                          disabled={!validateWalletForm() || isCreatingWallet}
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                        >
                          {isCreatingWallet ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {getTotalOwners() === 1
                                ? 'Creating Wallet...'
                                : 'Sending Invitations...'}
                            </>
                          ) : (
                            'Create Wallet'
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
