import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { prisma } from '@/lib/clients/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user's eERC registration status from database
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: auth.address,
      },
      select: {
        eercRegistered: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      eercRegistered: user.eercRegistered,
    })
  } catch (error) {
    console.error('Error fetching eERC registration status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eERC registration status' },
      { status: 500 }
    )
  }
}
