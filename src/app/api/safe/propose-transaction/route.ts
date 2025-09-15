// /api/safe/propose-transaction/route.ts
import Safe from '@safe-global/protocol-kit'
import { MetaTransactionData } from '@safe-global/types-kit'
import { NextRequest, NextResponse } from 'next/server'
import { i0 } from '@/lib/crypto-utils'
import { getChain } from '@/lib/environment/get-chain'
import { checkAuthStatus } from '@/actions/auth'

interface ProposeTransactionRequest {
  safeAddress: string
  transactionData: MetaTransactionData
  userSignature: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authStatus = await checkAuthStatus()
    if (!authStatus.isAuthenticated || !authStatus.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ProposeTransactionRequest = await request.json()
    const { safeAddress, transactionData, userSignature } = body

    if (!safeAddress || !transactionData || !userSignature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Derive private key from user signature (same as wallet creation)
    const derivedPrivateKey = i0(userSignature)
    const privateKeyHex = `0x${derivedPrivateKey.toString(16).padStart(64, '0')}`

    const chain = getChain()

    // Initialize Safe Protocol Kit with derived private key
    const protocolKit = await Safe.init({
      provider: chain.rpc,
      signer: privateKeyHex,
      safeAddress: safeAddress,
    })

    // Verify Safe ownership
    const owners = await protocolKit.getOwners()
    const threshold = await protocolKit.getThreshold()

    console.log('Safe owners:', owners)
    console.log('Safe threshold:', threshold)

    // Create the Safe transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [transactionData],
    })

    const txHash = await protocolKit.getTransactionHash(safeTransaction)
    console.log('Safe transaction hash:', txHash)

    if (threshold === 1) {
      // Single signature - sign and execute immediately
      console.log('Signing and executing single-owner Safe transaction...')

      const signedTransaction =
        await protocolKit.signTransaction(safeTransaction)
      const executionResult =
        await protocolKit.executeTransaction(signedTransaction)

      console.log('Transaction executed successfully!')
      console.log('Blockchain transaction hash:', executionResult.hash)

      return NextResponse.json({
        success: true,
        safeTxHash: txHash,
        blockchainTxHash: executionResult.hash,
        executed: true,
      })
    } else {
      // Multi-signature - just propose for now
      console.log(
        'Multi-signature transaction proposed, awaiting additional signatures'
      )

      return NextResponse.json({
        success: true,
        safeTxHash: txHash,
        executed: false,
        pendingSignatures: threshold - 1,
      })
    }
  } catch (error) {
    console.error('Error proposing Safe transaction:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to propose Safe transaction: ${errorMessage}` },
      { status: 500 }
    )
  }
}
