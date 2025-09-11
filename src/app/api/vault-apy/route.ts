import { getContract, readContract } from 'thirdweb'
import { avalanche } from 'thirdweb/chains'
import { NextRequest, NextResponse } from 'next/server'
import { thirdwebServerClient } from '@/lib/clients/thirdweb-server-client'
import { YIELD_VAULT_ABI } from '@/lib/constants/abis'
import { CONTRACT_ADDRESSES } from '@/lib/constants/contract-addresses'
import { SECONDS_PER_YEAR } from '@/lib/constants/time'

async function getVaultAPY(vaultAddress: string): Promise<number> {
  try {
    console.log(
      `[APY] Fetching APY for vault: ${vaultAddress} on Avalanche C-Chain mainnet`
    )

    const contract = getContract({
      client: thirdwebServerClient,
      chain: avalanche,
      address: vaultAddress as `0x${string}`,
      abi: YIELD_VAULT_ABI,
    })

    console.log(`[APY] Contract created for chain ID: ${avalanche.id}`)

    // Read all necessary data from the vault contract to calculate lender APY
    const [interestRate, totalBorrows, totalAssets, cash, interestFee] =
      await Promise.all([
        readContract({ contract, method: 'interestRate', params: [] }),
        readContract({ contract, method: 'totalBorrows', params: [] }),
        readContract({ contract, method: 'totalAssets', params: [] }),
        readContract({ contract, method: 'cash', params: [] }),
        readContract({ contract, method: 'interestFee', params: [] }),
      ])

    // console.log(`[APY] Raw data for ${vaultAddress}:`)
    // console.log(`[APY] - interestRate: ${interestRate.toString()}`)
    // console.log(`[APY] - totalBorrows: ${totalBorrows.toString()}`)
    // console.log(`[APY] - totalAssets: ${totalAssets.toString()}`)
    // console.log(`[APY] - cash: ${cash.toString()}`)
    // console.log(`[APY] - interestFee: ${interestFee.toString()}`)

    // Check for valid data
    if (totalAssets === BigInt(0)) {
      console.warn(`[APY] Got zero or invalid totalAssets for ${vaultAddress}`)
      return 0
    }

    // Calculate utilization rate
    const utilizationRate = Number(totalBorrows) / Number(totalAssets)
    console.log(
      `[APY] Utilization rate: ${utilizationRate} (${(utilizationRate * 100).toFixed(2)}%)`
    )

    // Convert interest rate from per-second to APY
    // interestRate is typically in 1e27 precision (ray)
    const interestRatePerSecond = Number(interestRate) / 1e27

    // Calculate borrow yield per second
    const borrowYieldPerSecond = interestRatePerSecond
    console.log(
      `[APY] Borrow yield per second: ${borrowYieldPerSecond.toExponential()}`
    )

    // Calculate borrow APY (what borrowers pay)
    const borrowAPY =
      (Math.pow(1 + borrowYieldPerSecond, SECONDS_PER_YEAR) - 1) * 100
    console.log(`[APY] Borrow APY: ${borrowAPY.toFixed(4)}%`)

    // Calculate supply APY (what lenders earn)
    // Supply APY = Borrow APY × Utilization Rate × (1 - Interest Fee)

    // Convert interest fee from basis points (1000 = 10%)
    const feeRate = Number(interestFee) / 10000 // Convert from basis points to decimal
    console.log(
      `[APY] Interest fee rate: ${feeRate} (${(feeRate * 100).toFixed(2)}%)`
    )

    // Calculate supply APY
    const supplyAPY = borrowAPY * utilizationRate * (1 - feeRate)

    console.log(`[APY] Supply APY calculation:`)
    console.log(`[APY] - Borrow APY: ${borrowAPY.toFixed(4)}%`)
    console.log(`[APY] - Utilization: ${(utilizationRate * 100).toFixed(2)}%`)
    console.log(`[APY] - Fee rate: ${(feeRate * 100).toFixed(2)}%`)
    console.log(`[APY] - Supply APY: ${supplyAPY.toFixed(4)}%`)

    // Validate supply APY is reasonable
    if (supplyAPY < 0 || supplyAPY > 50) {
      console.warn(`[APY] Unusual supply APY calculated: ${supplyAPY}%`)
      if (supplyAPY < 0) {
        console.log(`[APY] Negative APY, setting to 0`)
        return 0
      }
    }

    return Math.max(0, supplyAPY)
  } catch (error) {
    console.error(`[APY] Error fetching APY for vault ${vaultAddress}:`, error)

    // Return fallback APY based on vault address
    const fallbackRates: { [key: string]: number } = {
      [CONTRACT_ADDRESSES.VAULTS['re7-labs']]: 8.5, // RE7 Labs
      [CONTRACT_ADDRESSES.VAULTS['k3-capital']]: 7.2, // K3 Capital
      [CONTRACT_ADDRESSES.VAULTS['mev-capital']]: 6.8, // MEV Capital
    }
    const fallbackAPY = fallbackRates[vaultAddress] || 5.0
    console.log(`[APY] Using fallback APY: ${fallbackAPY}% for ${vaultAddress}`)
    return fallbackAPY
  }
}

// GET single vault APY
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vaultId = searchParams.get('vaultId')

    if (!vaultId) {
      return NextResponse.json(
        { error: 'vaultId parameter is required' },
        { status: 400 }
      )
    }

    const vaultAddress =
      CONTRACT_ADDRESSES.VAULTS[
        vaultId as keyof typeof CONTRACT_ADDRESSES.VAULTS
      ]

    if (!vaultAddress) {
      return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 })
    }

    const apy = await getVaultAPY(vaultAddress)

    return NextResponse.json({
      vaultId,
      vaultAddress,
      apy,
    })
  } catch (error) {
    console.error('Error fetching vault APY:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vault APY' },
      { status: 500 }
    )
  }
}

// POST all vault APYs
export async function POST(request: NextRequest) {
  try {
    // Fetch APY for all vaults
    const vaultIds = Object.keys(
      CONTRACT_ADDRESSES.VAULTS
    ) as (keyof typeof CONTRACT_ADDRESSES.VAULTS)[]

    const apyPromises = vaultIds.map(async (vaultId) => {
      try {
        const vaultAddress = CONTRACT_ADDRESSES.VAULTS[vaultId]
        const apy = await getVaultAPY(vaultAddress)

        return {
          vaultId,
          vaultAddress,
          apy,
        }
      } catch (error) {
        console.error(`Failed to fetch APY for ${vaultId}:`, error)
        return {
          vaultId,
          vaultAddress: CONTRACT_ADDRESSES.VAULTS[vaultId],
          apy: 0,
        }
      }
    })

    const results = await Promise.all(apyPromises)

    return NextResponse.json({
      vaults: results,
    })
  } catch (error) {
    console.error('Error fetching all vault APYs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vault APYs' },
      { status: 500 }
    )
  }
}
