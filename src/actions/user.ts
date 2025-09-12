'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/clients/prisma'
import { thirdwebAuth } from '@/lib/thirdweb-auth'

// Helper function to verify authentication
async function verifyAuth() {
  try {
    const cookieStore = await cookies()
    const jwt = cookieStore.get('auth-token')?.value

    if (!jwt) {
      return { isAuthenticated: false, error: 'Not authenticated' }
    }

    const authResult = await thirdwebAuth.verifyJWT({ jwt })

    if (!authResult.valid) {
      return { isAuthenticated: false, error: 'Invalid token' }
    }

    // Get user from database
    let user = null
    if (
      authResult.parsedJWT.ctx &&
      typeof authResult.parsedJWT.ctx === 'object' &&
      'userId' in authResult.parsedJWT.ctx
    ) {
      const userId = (authResult.parsedJWT.ctx as any).userId
      user = await prisma.user.findUnique({
        where: { id: userId as string },
      })
    }

    if (!user) {
      return { isAuthenticated: false, error: 'User not found' }
    }

    return {
      isAuthenticated: true,
      user,
      address: authResult.parsedJWT.sub,
    }
  } catch (error) {
    console.error('Error verifying auth:', error)
    return { isAuthenticated: false, error: 'Authentication failed' }
  }
}

export async function updateEercRegistrationStatus() {
  try {
    console.log('Updating EERC registration status...')

    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return { success: false, error: auth.error || 'Not authenticated' }
    }

    // Update user's eercRegistered status
    const updatedUser = await prisma.user.update({
      where: { id: auth.user!.id },
      data: { eercRegistered: true },
    })

    console.log('Updated user EERC registration status:', updatedUser.id)

    return {
      success: true,
      user: {
        id: updatedUser.id,
        eercRegistered: updatedUser.eercRegistered,
      },
    }
  } catch (error) {
    console.error('Error updating EERC registration status:', error)
    return {
      success: false,
      error: 'Failed to update EERC registration status',
    }
  }
}

export async function checkEercRegistrationStatus() {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return { success: false, error: auth.error || 'Not authenticated' }
    }

    return {
      success: true,
      eercRegistered: auth.user!.eercRegistered,
      user: {
        id: auth.user!.id,
        email: auth.user!.email,
        walletAddress: auth.user!.walletAddress,
        eercRegistered: auth.user!.eercRegistered,
      },
    }
  } catch (error) {
    console.error('Error checking EERC registration status:', error)
    return {
      success: false,
      error: 'Failed to check EERC registration status',
    }
  }
}
