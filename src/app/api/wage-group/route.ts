// import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { prisma } from '@/lib/clients/prisma'

// GET - Fetch all wage groups for authenticated user
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

    // Fetch wage groups for the authenticated user
    const wageGroups = await prisma.wageGroup.findMany({
      where: {
        creatorId: auth.user!.id,
      },
      include: {
        payees: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform the data to match the expected format
    const transformedWageGroups = wageGroups.map((group) => ({
      id: group.id,
      name: group.name,
      startDate: group.startDate.toISOString(),
      paymentDate: group.paymentDate,
      yieldSource: group.yieldSource.toLowerCase().replace('_', '-'),
      eercRegistered: group.eercRegistered,
      isActive: group.isActive,
      safeWalletAddress: group.safeWalletAddress,
      payees: group.payees.map((payee) => ({
        email: payee.email,
        monthlyAmount: parseFloat(payee.monthlyAmount),
      })),
    }))

    return NextResponse.json({
      success: true,
      wageGroups: transformedWageGroups,
    })
  } catch (error) {
    console.error('Error fetching wage groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wage groups' },
      { status: 500 }
    )
  }
}

// POST - Create a new wage group (optional, since we have server action)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Can implement wage group creation here as well
    // For now, we'll redirect to use the server action instead

    return NextResponse.json(
      { error: 'Use server action for creating wage groups' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in wage group POST:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
