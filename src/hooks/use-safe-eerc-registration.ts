'use client'

import Safe from '@safe-global/protocol-kit'
import { MetaTransactionData, OperationType } from '@safe-global/types-kit'
import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { formatPrivKeyForBabyJub } from 'maci-crypto'
import { poseidon3 } from 'poseidon-lite'
import * as snarkjs from 'snarkjs'
import { useActiveAccount } from 'thirdweb/react'
import { encodeFunctionData } from 'viem'
import { useState } from 'react'
import { REGISTRAR_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { i0 } from '@/lib/crypto-utils'
import { chain } from '@/lib/environment/get-chain'

interface UseSafeEercRegistrationProps {
  wageGroupId: string
  safeWalletAddress: string
  threshold: number
}

export function useSafeEercRegistration({
  wageGroupId,
  safeWalletAddress,
  threshold,
}: UseSafeEercRegistrationProps) {
  const account = useActiveAccount()

  const [isPreparingProof, setIsPreparingProof] = useState(false)
  const [isProposing, setIsProposing] = useState(false)
  const [isWaitingSignatures, setIsWaitingSignatures] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [safeTxHash, setSafeTxHash] = useState<string | null>(null)
  const [pendingSignatures, setPendingSignatures] = useState(0)

  const registerSafeEerc = async () => {
    if (!account?.address) {
      const connectError = new Error('No wallet connected')
      setError(connectError)
      return
    }

    if (!safeWalletAddress) {
      const safeError = new Error('No Safe wallet address provided')
      setError(safeError)
      return
    }

    setError(null)
    setIsConfirmed(false)
    setSafeTxHash(null)
    setPendingSignatures(0)

    try {
      // STEP 1: GENERATE PROOF
      setIsPreparingProof(true)
      console.log('Generating proof for Safe eERC registration...')

      // Use the same message format as wallet creation
      const message = `Creating Safe wallet for wage group`
      const signedMessage = await account.signMessage({ message })

      const privateKey = i0(signedMessage)
      const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
      const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) =>
        BigInt(x)
      ) as [bigint, bigint]

      const registrationHash = poseidon3([
        BigInt(chain.id),
        formattedPrivateKey,
        BigInt(safeWalletAddress),
      ])

      const inputs = {
        SenderPrivateKey: formattedPrivateKey,
        SenderPublicKey: publicKey,
        SenderAddress: BigInt(safeWalletAddress),
        ChainID: BigInt(chain.id),
        RegistrationHash: registrationHash,
      }

      const wasmPath = '/circuits/RegistrationCircuit.wasm'
      const zkeyPath = '/circuits/RegistrationCircuit.groth16.zkey'
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        wasmPath,
        zkeyPath
      )

      const formattedProof = {
        proofPoints: {
          a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as const,
          b: [
            [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
            [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
          ] as const,
          c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as const,
        },
        publicSignals: publicSignals.map((s: string) => BigInt(s)) as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ],
      }

      console.log('Proof generated successfully!')
      setIsPreparingProof(false)

      // STEP 2: ENCODE REGISTRAR CALL
      const encodedData = encodeFunctionData({
        abi: REGISTRAR_ABI,
        functionName: 'register',
        args: [formattedProof],
      })

      const safeTransactionData: MetaTransactionData = {
        to: CONTRACT_ADDRESSES.REGISTRAR,
        value: '0',
        data: encodedData,
        operation: OperationType.Call,
      }

      // STEP 3: USE BACKEND API FOR SAFE OPERATIONS
      setIsProposing(true)
      console.log('Creating Safe transaction proposal via backend...')

      // The backend will use the same derived private key approach as wallet creation
      // This ensures the derived address (Safe owner) can sign the transaction
      const response = await fetch('/api/safe/propose-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          safeAddress: safeWalletAddress,
          transactionData: safeTransactionData,
          userSignature: signedMessage, // Backend will derive same key as wallet creation
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to propose Safe transaction')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Transaction proposal failed')
      }

      setSafeTxHash(result.safeTxHash)
      console.log('Safe transaction proposed:', result.safeTxHash)
      setIsProposing(false)

      // STEP 4: HANDLE EXECUTION BASED ON THRESHOLD
      if (threshold === 1) {
        setIsExecuting(true)
        console.log(
          'Single signature Safe - transaction executed automatically'
        )

        // For single signature Safes, the transaction should be executed automatically
        // Update database to mark eERC as registered
        await updateWageGroupEercStatus(wageGroupId, true)
        setIsConfirmed(true)
        setIsExecuting(false)
      } else {
        // Multi-signature flow
        setIsWaitingSignatures(true)
        setPendingSignatures(threshold - 1)

        console.log(
          `Multi-signature transaction created. Requires ${threshold} signatures total.`
        )
        console.log('Safe transaction hash:', result.safeTxHash)

        // For multi-sig, show pending state
        setError(
          new Error(
            `Multi-signature Safe requires ${threshold} signatures. Transaction created but needs additional signatures to execute.`
          )
        )
        setIsWaitingSignatures(false)
      }
    } catch (err) {
      console.error('Safe eERC registration failed:', err)
      setError(err as Error)
    } finally {
      setIsPreparingProof(false)
      setIsProposing(false)
      setIsExecuting(false)
    }
  }

  const updateWageGroupEercStatus = async (
    wageGroupId: string,
    eercRegistered: boolean
  ) => {
    try {
      const response = await fetch('/api/wage-group/eerc-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wageGroupId, eercRegistered }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update eERC status')
      }

      console.log('Database eERC status updated successfully')
    } catch (error) {
      console.error('Database update failed:', error)
      throw error
    }
  }

  const isPending =
    isPreparingProof || isProposing || isWaitingSignatures || isExecuting

  return {
    registerSafeEerc,
    isPending,
    isPreparingProof,
    isProposing,
    isWaitingSignatures,
    isExecuting,
    isConfirmed,
    error,
    safeTxHash,
    pendingSignatures,
    threshold,
  }
}
