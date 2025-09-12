'use client'

import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { formatPrivKeyForBabyJub } from 'maci-crypto'
import { poseidon3 } from 'poseidon-lite'
import * as snarkjs from 'snarkjs'
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { useActiveAccount, useActiveWallet } from 'thirdweb/react'
import { useState } from 'react'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { REGISTRAR_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { i0 } from '@/lib/crypto-utils'
import { chain } from '@/lib/environment/get-chain'

export function useEercRegistration() {
  const activeWallet = useActiveWallet()
  const account = useActiveAccount()

  const [isPreparingProof, setIsPreparingProof] = useState(false)
  const [isWritePending, setIsWritePending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [hash, setHash] = useState<string | null>(null)

  // Create contract instance
  const contract = getContract({
    client: thirdwebClient,
    chain,
    address: CONTRACT_ADDRESSES.REGISTRAR,
    abi: REGISTRAR_ABI,
  })

  const register = async () => {
    if (!account || !activeWallet) {
      const connectError = new Error('No wallet connected')
      console.error('❌', connectError.message)
      setError(connectError)
      return
    }

    // Reset state for a new registration attempt
    setError(null)
    setHash(null)
    setIsConfirmed(false)
    setSignature(null)
    setIsPreparingProof(false)
    setIsWritePending(false)
    setIsConfirming(false)

    try {
      // === STEP 1: SIGN MESSAGE ===
      console.log('🔥 STARTING REGISTRATION PROCESS')
      const message = `eERC\nRegistering user with\n Address:${account.address.toLowerCase()}`
      console.log('📝 Requesting signature for message:', message)
      const signedMessage = await account.signMessage({ message })
      setSignature(signedMessage) // Set for UI/debugging if needed
      console.log('✅ Message signed successfully!')

      // === STEP 2: GENERATE PROOF ===
      setIsPreparingProof(true)
      console.log('🔐 Generating zero-knowledge proof...')

      const privateKey = i0(signedMessage)
      const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
      const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) =>
        BigInt(x)
      ) as [bigint, bigint]
      const registrationHash = poseidon3([
        BigInt(chain.id),
        formattedPrivateKey,
        BigInt(account.address),
      ])

      const inputs = {
        SenderPrivateKey: formattedPrivateKey,
        SenderPublicKey: publicKey,
        SenderAddress: BigInt(account.address),
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

      console.log('✅ Proof generated successfully!')
      setIsPreparingProof(false)

      // === STEP 3: SUBMIT TO BLOCKCHAIN ===
      setIsWritePending(true)
      console.log('🚀 SUBMITTING REGISTRATION TO BLOCKCHAIN')

      // Prepare the contract call using ThirdWeb v5
      const transaction = prepareContractCall({
        contract,
        method: 'register',
        params: [formattedProof],
      })

      // Send the transaction using ThirdWeb wallet directly
      const result = await sendTransaction({
        transaction,
        account,
      })

      const txHash = result.transactionHash
      setHash(txHash)
      console.log('✅ Registration submitted to blockchain! Hash:', txHash)

      // Wait for transaction confirmation
      const receipt = await waitForReceipt({
        client: thirdwebClient,
        chain,
        transactionHash: txHash,
      })

      console.log('✅ Registration confirmed on blockchain!')
      setIsWritePending(false)

      // === STEP 4: UPDATE DATABASE ===
      setIsConfirming(true)
      console.log('🔄 Updating database...')
      const response = await fetch('/api/user/update-eerc-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Failed to update EERC registration status in database')
      }
      console.log('✅ Database updated!')
      setIsConfirmed(true)
    } catch (err) {
      console.error('❌ Registration process failed:', err)
      setError(err as Error)
    } finally {
      // Ensure all loading states are reset in case of error or success
      setIsPreparingProof(false)
      setIsWritePending(false)
      setIsConfirming(false)
    }
  }

  const isPending = isPreparingProof || isWritePending || isConfirming

  return {
    register,
    isPending,
    isPreparingProof,
    isWritePending, // Expose this for more granular UI updates
    isConfirming,
    isConfirmed,
    error,
    hash,
    hasProofReady:
      !isPreparingProof && !!signature && !isWritePending && !isConfirming,
  }
}
