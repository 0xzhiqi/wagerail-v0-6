'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/clients/prisma'
import { emailLoginSchema } from '@/lib/schemas/auth'

import { thirdwebAuth } from '../lib/thirdweb-auth'

export async function generateLoginPayload(
  address: string,
  chainId: number = 43113
) {
  try {
    const payload = await thirdwebAuth.generatePayload({
      address,
      chainId,
    })

    console.log('Generated payload structure:', payload)
    return { success: true, payload }
  } catch (error) {
    console.error('Error generating login payload:', error)
    return { success: false, error: 'Failed to generate login payload' }
  }
}

export async function verifyLoginAndCreateUser(
  payload: any,
  signature: string,
  email: string
) {
  try {
    console.log('Verifying login for email:', email)

    // Validate email
    const validatedData = emailLoginSchema.parse({ email })

    // Verify the payload signature
    console.log('Verifying payload signature...')
    const verifiedPayload = await thirdwebAuth.verifyPayload({
      payload,
      signature,
    })

    if (!verifiedPayload.valid) {
      console.error('Payload verification failed')
      return { success: false, error: 'Invalid signature' }
    }

    console.log('Payload verified successfully')

    const walletAddress = verifiedPayload.payload.address
    console.log('Wallet address:', walletAddress)

    // Check if user exists, if not create new user
    console.log('Checking for existing user...')
    let user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      console.log('User not found, checking for existing wallet...')
      // Check if wallet address already exists with different email
      const existingWalletUser = await prisma.user.findUnique({
        where: { walletAddress },
      })

      if (existingWalletUser) {
        console.log('Updating existing wallet user with new email')
        // Update existing user with new email
        user = await prisma.user.update({
          where: { walletAddress },
          data: { email: validatedData.email },
        })
      } else {
        console.log('Creating new user')
        // Create new user
        user = await prisma.user.create({
          data: {
            email: validatedData.email,
            walletAddress,
          },
        })
      }
    } else if (user.walletAddress !== walletAddress) {
      console.log('Updating user wallet address')
      // Update wallet address if different
      user = await prisma.user.update({
        where: { email: validatedData.email },
        data: { walletAddress },
      })
    }

    console.log('User operations completed:', user.id)

    // Generate JWT
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
      context: {
        userId: user.id,
        email: user.email,
      },
    })

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    }
  } catch (error) {
    console.error('Error verifying login:', error)
    return { success: false, error: 'Failed to verify login' }
  }
}

export async function checkAuthStatus() {
  try {
    const cookieStore = await cookies()
    const jwt = cookieStore.get('auth-token')?.value

    if (!jwt) {
      return { isAuthenticated: false }
    }

    const authResult = await thirdwebAuth.verifyJWT({ jwt })

    if (!authResult.valid) {
      return { isAuthenticated: false }
    }

    // Get user from database
    let user = null

    // Safely check if ctx exists and has userId
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

    return {
      isAuthenticated: true,
      address: authResult.parsedJWT.sub,
      user: user
        ? {
            id: user.id,
            email: user.email,
            walletAddress: user.walletAddress,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : null,
    }
  } catch (error) {
    console.error('Error checking auth status:', error)
    return { isAuthenticated: false }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')

  redirect('/')
}
