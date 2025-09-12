'use client'

import {
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { useActiveAccount, useActiveWallet } from 'thirdweb/react'
import { useEffect, useState } from 'react'
import { thirdwebClient } from '@/lib/clients/thirdweb-client'
import { EERC_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { chain } from '@/lib/environment/get-chain'

export function useEercAuditor() {
  const activeAccount = useActiveAccount()
  const activeWallet = useActiveWallet()
  const [isSettingAuditor, setIsSettingAuditor] = useState(false)
  const [auditorAddress, setAuditorAddress] = useState<string | null>(null)
  const [contractOwner, setContractOwner] = useState<string | null>(null)
  const [hasAuditor, setHasAuditor] = useState(false)
  const [auditorLoading, setAuditorLoading] = useState(false)
  const [ownerLoading, setOwnerLoading] = useState(false)
  const [auditorError, setAuditorError] = useState<Error | null>(null)
  const [setAuditorTransactionError, setSetAuditorTransactionError] =
    useState<Error | null>(null)
  const [isSetAuditorConfirmed, setIsSetAuditorConfirmed] = useState(false)
  const [setAuditorHash, setSetAuditorHash] = useState<string | null>(null)

  const contractAddress = CONTRACT_ADDRESSES.EERC as `0x${string}`

  // Check if user is contract owner
  const isContractOwner =
    activeAccount?.address && contractOwner
      ? activeAccount.address.toLowerCase() === contractOwner.toLowerCase()
      : false

  // Fetch auditor address
  const fetchAuditor = async () => {
    if (!activeAccount) return

    try {
      setAuditorLoading(true)
      setAuditorError(null)

      const result = await readContract({
        contract: {
          client: thirdwebClient,
          address: contractAddress,
          chain,
          abi: EERC_ABI,
        },
        method: 'auditor',
        params: [],
      })

      const auditorAddr = result as string
      setAuditorAddress(auditorAddr)
      setHasAuditor(
        auditorAddr !== '0x0000000000000000000000000000000000000000'
      )
    } catch (error) {
      console.error('Error fetching auditor:', error)
      setAuditorError(error as Error)
    } finally {
      setAuditorLoading(false)
    }
  }

  // Fetch contract owner
  const fetchOwner = async () => {
    if (!activeAccount) return

    try {
      setOwnerLoading(true)

      const result = await readContract({
        contract: {
          client: thirdwebClient,
          address: contractAddress,
          chain,
          abi: EERC_ABI,
        },
        method: 'owner',
        params: [],
      })

      setContractOwner(result as string)
    } catch (error) {
      console.error('Error fetching owner:', error)
    } finally {
      setOwnerLoading(false)
    }
  }

  // Set auditor function
  const handleSetAuditor = async (auditorWalletAddress: `0x${string}`) => {
    if (!activeAccount || !activeWallet) {
      throw new Error('Wallet not connected')
    }

    if (!isContractOwner) {
      throw new Error('Only contract owner can set auditor')
    }

    try {
      setIsSettingAuditor(true)
      setSetAuditorTransactionError(null)
      setIsSetAuditorConfirmed(false)

      console.log('🔐 Setting auditor address:', auditorWalletAddress)

      const transaction = prepareContractCall({
        contract: {
          client: thirdwebClient,
          address: contractAddress,
          chain,
          abi: EERC_ABI,
        },
        method: 'setAuditorPublicKey',
        params: [auditorWalletAddress],
      })

      const { transactionHash } = await sendTransaction({
        transaction,
        account: activeAccount,
      })

      setSetAuditorHash(transactionHash)

      // Wait for transaction confirmation
      const receipt = await waitForReceipt({
        client: thirdwebClient,
        chain,
        transactionHash,
      })

      if (receipt.status === 'success') {
        setIsSetAuditorConfirmed(true)
        // Refetch auditor after successful transaction
        setTimeout(() => {
          fetchAuditor()
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Error setting auditor:', error)
      setSetAuditorTransactionError(error as Error)
      throw error
    } finally {
      setIsSettingAuditor(false)
    }
  }

  // Initial data fetching
  useEffect(() => {
    if (activeAccount) {
      fetchAuditor()
      fetchOwner()
    }
  }, [activeAccount])

  return {
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
    refetchAuditor: fetchAuditor,
  }
}
