'use client'

import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { formatPrivKeyForBabyJub } from 'maci-crypto'
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { useActiveAccount } from 'thirdweb/react'
import { useState } from 'react'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { EERC_ABI, REGISTRAR_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import {
  createUserFromPrivateKey,
  getDecryptedBalance,
  i0,
  privateTransfer,
} from '@/lib/crypto-utils'
import { chain } from '@/lib/environment/get-chain'

interface UsePrivateTransferProps {
  safeWalletAddress: string
}

export function usePrivateTransfer({
  safeWalletAddress,
}: UsePrivateTransferProps) {
  const account = useActiveAccount()

  const [isPreparingTransfer, setIsPreparingTransfer] = useState(false)
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [isWritePending, setIsWritePending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hash, setHash] = useState<string | null>(null)

  // Create contract instances
  const eercContract = getContract({
    client: thirdwebClient,
    chain,
    address: CONTRACT_ADDRESSES.EERC,
    abi: EERC_ABI,
  })

  const registrarContract = getContract({
    client: thirdwebClient,
    chain,
    address: CONTRACT_ADDRESSES.REGISTRAR,
    abi: REGISTRAR_ABI,
  })

  const transfer = async (transferAmount: number, tokenAddress: string) => {
    if (!account?.address) {
      const connectError = new Error('No wallet connected')
      setError(connectError)
      return false
    }

    if (!safeWalletAddress) {
      const safeError = new Error('No Safe wallet address provided')
      setError(safeError)
      return false
    }

    if (!tokenAddress) {
      const tokenError = new Error('No token address provided for transfer')
      setError(tokenError)
      return false
    }

    if (!transferAmount || transferAmount <= 0) {
      const amountError = new Error('Invalid transfer amount')
      setError(amountError)
      return false
    }

    // Reset state for a new transfer attempt
    setError(null)
    setHash(null)
    setIsConfirmed(false)
    setIsPreparingTransfer(false)
    setIsGeneratingProof(false)
    setIsWritePending(false)
    setIsConfirming(false)

    try {
      // === STEP 1: SIGN MESSAGE ===
      setIsPreparingTransfer(true)
      console.log('🔥 STARTING PRIVATE TRANSFER PROCESS')

      const message = `eERC\nRegistering user with\n Address:${account.address.toLowerCase()}`
      console.log('📝 Requesting signature for message:', message)
      const signedMessage = await account.signMessage({ message })
      console.log('✅ Message signed successfully!')

      // === STEP 2: DERIVE KEYS ===
      console.log('🔐 Deriving cryptographic keys...')
      const privateKey = i0(signedMessage)
      const userPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
      const derivedPublicKey = mulPointEscalar(Base8, userPrivateKey).map((x) =>
        BigInt(x)
      ) as [bigint, bigint]

      console.log('✅ Keys derived successfully!')

      // === STEP 3: PREPARE TRANSFER DATA ===
      console.log('📊 Preparing transfer data...')

      // Check if Safe wallet is registered
      const isSafeRegistered = await readContract({
        contract: registrarContract,
        method: 'isUserRegistered',
        params: [safeWalletAddress],
      })

      if (!isSafeRegistered) {
        throw new Error('Safe wallet not registered in eERC system')
      }

      console.log('tokenAddress_reading_in_userPrivateTransfer:', tokenAddress)
      // Get user's current encrypted balance using the CORRECT tokenAddress
      const [eGCT, nonce, amountPCTs, balancePCT, transactionIndex] =
        await readContract({
          contract: eercContract,
          method: 'getBalanceFromTokenAddress',
          params: [account.address, tokenAddress],
        })

      // Prepare encrypted balance data for getDecryptedBalance
      const encryptedBalance = [
        [BigInt(eGCT.c1.x.toString()), BigInt(eGCT.c1.y.toString())],
        [BigInt(eGCT.c2.x.toString()), BigInt(eGCT.c2.y.toString())],
      ]
      const balancePCTArray = balancePCT.map((x: any) => BigInt(x.toString()))

      console.log('Raw eGCT values:', encryptedBalance)

      const isEGCTEmpty =
        encryptedBalance[0][0] === 0n &&
        encryptedBalance[0][1] === 0n &&
        encryptedBalance[1][0] === 0n &&
        encryptedBalance[1][1] === 0n

      if (isEGCTEmpty && balancePCTArray.every((x) => x === 0n)) {
        throw new Error('No encrypted balance to transfer')
      }

      // FIX: Properly flatten the amountPCTs array structure
      // amountPCTs is an array of {pct: [7 elements], index: number}
      // We need to extract all the .pct arrays and flatten them
      console.log('Raw amountPCTs structure:', amountPCTs)

      const flattenedAmountPCTs: bigint[] = []
      for (const amountPCT of amountPCTs) {
        // Each amountPCT has a .pct property with 7 elements
        const pctArray = amountPCT.pct.map((x: any) => BigInt(x.toString()))
        flattenedAmountPCTs.push(...pctArray)
      }

      console.log('Flattened amountPCTs length:', flattenedAmountPCTs.length)
      console.log('Sample flattened values:', flattenedAmountPCTs.slice(0, 14)) // Show first 2 PCTs worth

      // Use getDecryptedBalance with the correctly flattened structure
      const userCurrentBalance = await getDecryptedBalance(
        userPrivateKey,
        flattenedAmountPCTs, // Now properly flattened
        balancePCTArray,
        encryptedBalance
      )

      console.log('💰 User current balance:', userCurrentBalance.toString())

      if (userCurrentBalance <= 0n) {
        throw new Error('No balance to transfer')
      }

      // Convert transferAmount to encrypted system units (2 decimals)
      const transferAmountBigInt = BigInt(Math.floor(transferAmount * 1e2))

      // Ensure we don't transfer more than available
      if (transferAmountBigInt > userCurrentBalance) {
        throw new Error('Transfer amount exceeds available balance')
      }

      console.log('💸 Transfer amount:', transferAmountBigInt.toString())

      // Create user object for transfer
      const user = createUserFromPrivateKey(userPrivateKey, {
        address: account.address,
        signMessage: async (params: { message: string }) => signedMessage,
        getAddress: async () => account.address,
      })

      // Get Safe wallet's public key
      const safePublicKey = await readContract({
        contract: registrarContract,
        method: 'getUserPublicKey',
        params: [safeWalletAddress],
      })

      const receiverPublicKeyArray = [
        BigInt(safePublicKey[0].toString()),
        BigInt(safePublicKey[1].toString()),
      ]

      // Get auditor's public key
      const auditorPublicKey = await readContract({
        contract: eercContract,
        method: 'auditorPublicKey',
        params: [],
      })

      const auditorPublicKeyArray = [
        BigInt(auditorPublicKey[0].toString()),
        BigInt(auditorPublicKey[1].toString()),
      ]

      // Prepare data for transfer proof generation - need to convert back to the format expected by privateTransfer
      const senderEncryptedBalance = [
        encryptedBalance[0][0],
        encryptedBalance[0][1],
        encryptedBalance[1][0],
        encryptedBalance[1][1],
      ]

      setIsPreparingTransfer(false)

      // === STEP 4: GENERATE PROOF ===
      setIsGeneratingProof(true)
      console.log('🔐 Generating zero-knowledge proof...')

      // Generate transfer proof using the specific transfer amount
      const { proof, senderBalancePCT } = await privateTransfer(
        user,
        userCurrentBalance,
        receiverPublicKeyArray,
        transferAmountBigInt,
        senderEncryptedBalance,
        auditorPublicKeyArray
      )

      console.log('✅ Proof generated successfully!')
      setIsGeneratingProof(false)

      // === STEP 5: SUBMIT TO BLOCKCHAIN ===
      setIsWritePending(true)
      console.log('🚀 SUBMITTING TRANSFER TO BLOCKCHAIN')

      // Get token ID for the contract call
      const tokenId = await readContract({
        contract: eercContract,
        method: 'tokenIds',
        params: [tokenAddress],
      })

      if (tokenId === 0n) {
        throw new Error('Token not registered in EncryptedERC')
      }

      // Transform proof structure to match contract expectations
      const transferProof = {
        proofPoints: {
          a: [BigInt(proof.a[0]), BigInt(proof.a[1])] as readonly [
            bigint,
            bigint,
          ],
          b: [
            [BigInt(proof.b[0][0]), BigInt(proof.b[0][1])],
            [BigInt(proof.b[1][0]), BigInt(proof.b[1][1])],
          ] as readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
          c: [BigInt(proof.c[0]), BigInt(proof.c[1])] as readonly [
            bigint,
            bigint,
          ],
        },
        publicSignals: (proof.inputs.length >= 32
          ? proof.inputs.slice(0, 32).map((input: string) => BigInt(input))
          : [
              ...proof.inputs.map((input: string) => BigInt(input)),
              ...Array(32 - proof.inputs.length).fill(0n),
            ]) as unknown as readonly [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ],
      }

      // Ensure senderBalancePCT is exactly 7 elements
      const formattedSenderBalancePCT = (senderBalancePCT.length >= 7
        ? senderBalancePCT.slice(0, 7)
        : [
            ...senderBalancePCT,
            ...Array(7 - senderBalancePCT.length).fill(0n),
          ]) as unknown as readonly [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ]

      // Prepare the contract call
      const transaction = prepareContractCall({
        contract: eercContract,
        method: 'transfer',
        params: [
          safeWalletAddress,
          tokenId,
          transferProof,
          formattedSenderBalancePCT,
        ],
      })

      // Send the transaction
      const result = await sendTransaction({
        transaction,
        account,
      })

      const txHash = result.transactionHash
      setHash(txHash)
      console.log('✅ Transfer submitted to blockchain! Hash:', txHash)

      // Wait for transaction confirmation
      const receipt = await waitForReceipt({
        client: thirdwebClient,
        chain,
        transactionHash: txHash,
      })

      console.log('✅ Transfer confirmed on blockchain!')
      setIsWritePending(false)
      setIsConfirmed(true)

      return true
    } catch (err) {
      console.error('❌ Private transfer failed:', err)
      setError(err as Error)
      return false
    } finally {
      // Ensure all loading states are reset
      setIsPreparingTransfer(false)
      setIsGeneratingProof(false)
      setIsWritePending(false)
      setIsConfirming(false)
    }
  }

  const isPending =
    isPreparingTransfer || isGeneratingProof || isWritePending || isConfirming

  return {
    transfer,
    isPending,
    isPreparingTransfer,
    isGeneratingProof,
    isWritePending,
    isConfirming,
    isConfirmed,
    error,
    hash,
  }
}
