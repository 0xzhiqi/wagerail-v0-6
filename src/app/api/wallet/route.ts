import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from '@safe-global/protocol-kit'
import { createPublicClient, createWalletClient, http, type Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/clients/prisma'
import { i0 } from '@/lib/crypto-utils'
import { sendWalletOwnerInvitation } from '@/lib/email'
import { getAppUrls } from '@/lib/environment'
import { getChain } from '@/lib/environment/get-chain'
import { checkAuthStatus } from '@/actions/auth'

interface CreateWalletRequest {
  wageGroupId: string
  includeSelf: boolean
  ownerEmails: string[]
  threshold: number
  userSignature: string // Add signature from frontend
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

// Helper function to fund wallet with AVAX
async function fundWalletWithAvax(walletAddress: string): Promise<boolean> {
  try {
    const { faucetApi } = getAppUrls()

    console.log(`Using faucet API: ${faucetApi}`)
    console.log(`Funding wallet ${walletAddress} with 0.5 AVAX...`)

    const response = await fetch(`${faucetApi}/api/faucet/avax`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        amount: 2,
      }),
    })

    if (!response.ok) {
      console.error(`Faucet request failed with status: ${response.status}`)
      return false
    }

    const data = await response.json()

    if (data.success) {
      console.log(`Successfully funded wallet ${walletAddress} with 0.5 AVAX`)
      return true
    } else {
      console.error(`Faucet request failed: ${data.error}`)
      return false
    }
  } catch (error) {
    console.error(`Error funding wallet ${walletAddress}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authStatus = await checkAuthStatus()
    if (!authStatus.isAuthenticated || !authStatus.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateWalletRequest = await request.json()
    const { wageGroupId, includeSelf, ownerEmails, threshold, userSignature } =
      body

    // Validate input
    if (!wageGroupId || threshold < 1) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    if (!userSignature) {
      return NextResponse.json(
        { error: 'User signature required' },
        { status: 400 }
      )
    }

    // Get wage group and verify ownership
    const wageGroup = await prisma.wageGroup.findFirst({
      where: {
        id: wageGroupId,
        creatorId: authStatus.user.id,
      },
    })

    if (!wageGroup) {
      return NextResponse.json(
        { error: 'Wage group not found' },
        { status: 404 }
      )
    }

    if (wageGroup.safeWalletAddress) {
      return NextResponse.json(
        { error: 'Wallet already exists' },
        { status: 400 }
      )
    }

    // Filter out empty emails and duplicates
    const validEmails = ownerEmails
      .filter((email) => email.trim() !== '')
      .filter((email, index, arr) => arr.indexOf(email) === index)

    // Calculate total owners
    const totalOwners = (includeSelf ? 1 : 0) + validEmails.length

    if (totalOwners === 0) {
      return NextResponse.json(
        { error: 'At least one owner is required' },
        { status: 400 }
      )
    }

    if (threshold > totalOwners) {
      return NextResponse.json(
        { error: 'Threshold cannot exceed total owners' },
        { status: 400 }
      )
    }

    // Derive private key and address from user signature (same as eERC registration)
    const derivedPrivateKey = i0(userSignature)
    const privateKeyHex = `0x${derivedPrivateKey.toString(16).padStart(64, '0')}`
    const derivedAccount = privateKeyToAccount(privateKeyHex as `0x${string}`)
    const ownerAddress = derivedAccount.address

    console.log('Derived owner address from signature:', ownerAddress)

    // Generate unique numeric salt for this wage group (Safe SDK requires numeric string)
    const timestamp = Date.now().toString()
    const randomNum = Math.floor(Math.random() * 1000000).toString()
    const saltNonce = `${timestamp}${randomNum}`

    // If only current user, create Safe directly
    if (totalOwners === 1 && includeSelf && validEmails.length === 0) {
      try {
        // Initialize Safe with derived address as sole owner
        const chain = getChain()
        console.log('Creating Safe with owner:', ownerAddress)

        const safeAccountConfig: SafeAccountConfig = {
          owners: [ownerAddress], // Use derived address instead of authStatus.user.walletAddress
          threshold: 1,
        }

        const predictedSafe: PredictedSafeProps = {
          safeAccountConfig,
          safeDeploymentConfig: {
            saltNonce: saltNonce,
            safeVersion: '1.3.0',
          },
        }

        const protocolKit = await Safe.init({
          provider: chain.rpc,
          signer: privateKeyHex, // Use derived private key
          predictedSafe,
        })

        // Get predicted Safe address
        const safeAddress = await protocolKit.getAddress()
        console.log('Predicted Safe address with salt:', safeAddress)

        // Create viem client for transaction execution
        const thirdwebChain = getChain()

        // Create compatible viem chain from thirdweb chain
        const viemChain: Chain = {
          id: thirdwebChain.id,
          name: thirdwebChain.name || 'Avalanche C-Chain',
          nativeCurrency: {
            name: thirdwebChain.nativeCurrency?.name || 'AVAX',
            symbol: thirdwebChain.nativeCurrency?.symbol || 'AVAX',
            decimals: thirdwebChain.nativeCurrency?.decimals || 18,
          },
          rpcUrls: {
            default: {
              http: [thirdwebChain.rpc],
            },
          },
        }

        const walletClient = createWalletClient({
          account: derivedAccount, // Use derived account
          chain: viemChain,
          transport: http(thirdwebChain.rpc),
        })

        const publicClient = createPublicClient({
          chain: viemChain,
          transport: http(thirdwebChain.rpc),
        })

        // 👇 NEW: FUND THE SIGNER EOA BEFORE DEPLOYMENT — THIS IS THE CRITICAL FIX
        const fundingSignerSuccess = await fundWalletWithAvax(ownerAddress)
        if (!fundingSignerSuccess) {
          console.error(
            `Failed to fund signer account ${ownerAddress} with AVAX`
          )
          return NextResponse.json(
            {
              error:
                'Failed to fund signer account with AVAX. Please try again.',
            },
            { status: 500 }
          )
        }
        console.log(
          `Successfully funded signer account ${ownerAddress} with 0.5 AVAX`
        )

        // Check if Safe already exists (shouldn't happen with unique salt, but good to verify)
        try {
          const existingCode = await publicClient.getBytecode({
            address: safeAddress as `0x${string}`,
          })

          if (existingCode && existingCode !== '0x') {
            console.log('Safe already exists at address:', safeAddress)

            // Update wage group with existing Safe address
            await prisma.wageGroup.update({
              where: { id: wageGroupId },
              data: {
                safeWalletAddress: safeAddress,
                threshold,
                saltNonce: saltNonce,
              },
            })

            await prisma.wageGroupWalletOwnership.create({
              data: {
                userId: authStatus.user.id,
                wageGroupId,
                accepted: true,
              },
            })

            // Fund the existing wallet with 0.5 AVAX (the Safe address, not the deployer)
            const fundingSuccess = await fundWalletWithAvax(safeAddress)

            return NextResponse.json({
              success: true,
              safeAddress,
              saltNonce,
              message: 'Existing wallet linked successfully',
              fundingSuccess,
            })
          }
        } catch (checkError) {
          console.log('Safe does not exist yet, proceeding with deployment')
        }

        // Create deployment transaction
        const deploymentTransaction =
          await protocolKit.createSafeDeploymentTransaction()

        console.log('Deploying Safe with transaction data:', {
          to: deploymentTransaction.to,
          value: deploymentTransaction.value,
          dataLength: deploymentTransaction.data?.length,
        })

        // Execute deployment
        const transactionHash = await walletClient.sendTransaction({
          to: deploymentTransaction.to as `0x${string}`,
          value: BigInt(deploymentTransaction.value),
          data: deploymentTransaction.data as `0x${string}`,
        })

        console.log('Safe deployment transaction sent:', transactionHash)

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: transactionHash,
        })

        console.log('Safe deployment confirmed in block:', receipt.blockNumber)

        // Verify deployment was successful
        const deployedCode = await publicClient.getCode({
          address: safeAddress as `0x${string}`,
        })

        if (!deployedCode || deployedCode === '0x') {
          throw new Error('Safe deployment failed - no code at address')
        }

        // Update wage group with Safe address, threshold, and salt
        await prisma.wageGroup.update({
          where: { id: wageGroupId },
          data: {
            safeWalletAddress: safeAddress,
            threshold,
            saltNonce: saltNonce,
          },
        })

        // Create ownership record for current user
        await prisma.wageGroupWalletOwnership.create({
          data: {
            userId: authStatus.user.id,
            wageGroupId,
            accepted: true,
          },
        })

        // Fund the newly created Safe wallet with 0.5 AVAX (for wallet operating funds)
        const fundingSuccess = await fundWalletWithAvax(safeAddress)

        return NextResponse.json({
          success: true,
          safeAddress,
          saltNonce,
          transactionHash,
          message: 'Wallet created successfully',
          fundingSuccess,
        })
      } catch (error) {
        console.error('Error creating Safe:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        return NextResponse.json(
          { error: `Failed to create Safe wallet: ${errorMessage}` },
          { status: 500 }
        )
      }
    }

    // Handle multi-owner scenario
    // Send invitations to other emails
    const currentUser = authStatus.user
    const userName =
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      'A team member'

    // Create pending invites for all emails
    for (const email of validEmails) {
      try {
        // Create pending invite record
        await prisma.wageGroupWalletInvite.create({
          data: {
            wageGroupId,
            email,
          },
        })

        // Send invitation email
        await sendWalletOwnerInvitation({
          recipientEmail: email,
          inviterName: userName,
          wageGroupName: wageGroup.name,
          inviterEmail: currentUser.email,
        })

        console.log(`Wallet owner invitation sent to: ${email}`)
      } catch (error) {
        console.error(`Failed to send invitation to ${email}:`, error)
        // Continue with other emails even if one fails
      }
    }

    // Create ownership record for current user if included
    if (includeSelf) {
      await prisma.wageGroupWalletOwnership.create({
        data: {
          userId: authStatus.user.id,
          wageGroupId,
          accepted: true,
        },
      })
    }

    // Update threshold and salt in wage group
    await prisma.wageGroup.update({
      where: { id: wageGroupId },
      data: {
        threshold,
        saltNonce: saltNonce,
      },
    })

    return NextResponse.json({
      success: true,
      saltNonce,
      message: `Invitations sent to ${validEmails.length} email${validEmails.length === 1 ? '' : 's'}`,
    })
  } catch (error) {
    console.error('Error creating wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authStatus = await checkAuthStatus()
    if (!authStatus.isAuthenticated || !authStatus.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wageGroupId = searchParams.get('wageGroupId')

    if (!wageGroupId) {
      return NextResponse.json(
        { error: 'Wage group ID required' },
        { status: 400 }
      )
    }

    // Get wage group and verify access
    const wageGroup = await prisma.wageGroup.findFirst({
      where: {
        id: wageGroupId,
        creatorId: authStatus.user.id,
      },
      include: {
        ownerships: {
          include: {
            user: true,
          },
        },
        pendingInvites: true,
      },
    })

    if (!wageGroup) {
      return NextResponse.json(
        { error: 'Wage group not found' },
        { status: 404 }
      )
    }

    // Format response data
    const walletData: WalletData = {
      owners: wageGroup.ownerships.map((ownership) => ({
        email: ownership.user.email,
        accepted: ownership.accepted,
        isCurrentUser: ownership.userId === authStatus.user!.id,
        userId: ownership.userId,
      })),
      pendingInvites: wageGroup.pendingInvites.map((invite) => ({
        email: invite.email,
        accepted: invite.accepted,
      })),
      threshold: wageGroup.threshold,
      safeWalletAddress: wageGroup.safeWalletAddress,
    }

    return NextResponse.json({ success: true, data: walletData })
  } catch (error) {
    console.error('Error fetching wallet data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
