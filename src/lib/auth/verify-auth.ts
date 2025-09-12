import { cookies } from 'next/headers'
import { prisma } from '@/lib/clients/prisma'
import { thirdwebAuth } from '@/lib/thirdweb-auth'

export async function verifyAuth() {
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
