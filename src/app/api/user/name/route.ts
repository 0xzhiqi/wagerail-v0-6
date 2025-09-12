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

    // Get user's name information from database
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: auth.address,
      },
      select: {
        firstName: true,
        middleName: true,
        lastName: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
    })
  } catch (error) {
    console.error('Error fetching user name:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user name' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: auth.error || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { firstName, middleName, lastName } = body

    // Validate input (basic validation)
    if (
      typeof firstName !== 'string' &&
      firstName !== null &&
      firstName !== undefined
    ) {
      return NextResponse.json({ error: 'Invalid firstName' }, { status: 400 })
    }
    if (
      typeof middleName !== 'string' &&
      middleName !== null &&
      middleName !== undefined
    ) {
      return NextResponse.json({ error: 'Invalid middleName' }, { status: 400 })
    }
    if (
      typeof lastName !== 'string' &&
      lastName !== null &&
      lastName !== undefined
    ) {
      return NextResponse.json({ error: 'Invalid lastName' }, { status: 400 })
    }

    // Update user's name information (only update, don't create)
    const updatedUser = await prisma.user.update({
      where: {
        walletAddress: auth.address,
      },
      data: {
        firstName: firstName?.trim() || null,
        middleName: middleName?.trim() || null,
        lastName: lastName?.trim() || null,
      },
      select: {
        firstName: true,
        middleName: true,
        lastName: true,
      },
    })

    return NextResponse.json({
      success: true,
      firstName: updatedUser.firstName || '',
      middleName: updatedUser.middleName || '',
      lastName: updatedUser.lastName || '',
    })
  } catch (error) {
    console.error('Error updating user name:', error)
    return NextResponse.json(
      { error: 'Failed to update user name' },
      { status: 500 }
    )
  }
}
