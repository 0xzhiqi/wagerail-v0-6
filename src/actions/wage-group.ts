'use server'

import { YieldSource } from '@prisma/client'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/clients/prisma'
import { sendWageGroupInvitation } from '@/lib/email'
import { thirdwebAuth } from '@/lib/thirdweb-auth'

// Schema for wage group creation
const createWageGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  paymentDate: z
    .string()
    .transform((val) => parseInt(val))
    .refine(
      (val) => val >= 1 && val <= 31,
      'Payment date must be between 1 and 31'
    ),
  yieldSource: z.enum(['none', 're7-labs', 'k3-capital', 'mev-capital']),
  payees: z
    .array(
      z.object({
        email: z.string().email('Invalid email'),
        monthlyAmount: z
          .string()
          .transform((val) => parseFloat(val))
          .refine((val) => val > 0, 'Amount must be positive'),
      })
    )
    .min(1, 'At least one payee is required'),
})

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

// Helper function to map yield source string to enum
function mapYieldSource(yieldSource: string): YieldSource {
  switch (yieldSource) {
    case 're7-labs':
      return YieldSource.RE7_LABS
    case 'k3-capital':
      return YieldSource.K3_CAPITAL
    case 'mev-capital':
      return YieldSource.MEV_CAPITAL
    default:
      return YieldSource.NONE
  }
}

export async function createWageGroup(formData: any) {
  try {
    console.log('Creating wage group with data:', formData)

    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return { success: false, error: auth.error || 'Not authenticated' }
    }

    // Validate form data
    const validatedData = createWageGroupSchema.parse(formData)
    console.log('Validated data:', validatedData)

    // Generate a mock safe wallet address (in production, this would be created via smart contract)
    const safeWalletAddress = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`

    // Create wage group in database
    const wageGroup = await prisma.wageGroup.create({
      data: {
        name: validatedData.name,
        startDate: new Date(validatedData.startDate),
        paymentDate: validatedData.paymentDate,
        yieldSource: mapYieldSource(validatedData.yieldSource),
        safeWalletAddress,
        creatorId: auth.user!.id,
        payees: {
          create: validatedData.payees.map((payee) => ({
            email: payee.email,
            monthlyAmount: payee.monthlyAmount.toString(),
          })),
        },
      },
      include: {
        payees: true,
        creator: true,
      },
    })

    console.log('Created wage group:', wageGroup.id)

    // Send invitation emails to all payees
    console.log('Sending invitation emails to payees...')
    const emailResults = await Promise.allSettled(
      wageGroup.payees.map(async (payee) => {
        try {
          const result = await sendWageGroupInvitation({
            recipientEmail: payee.email,
            inviterName:
              auth.user!.firstName && auth.user!.lastName
                ? `${auth.user!.firstName} ${auth.user!.lastName}`
                : auth.user!.email,
            wageGroupName: wageGroup.name,
            monthlyAmount: parseFloat(payee.monthlyAmount),
          })

          console.log(`Email sent to ${payee.email}:`, result.success)
          return { email: payee.email, ...result }
        } catch (error) {
          console.error(`Failed to send email to ${payee.email}:`, error)
          return { email: payee.email, success: false, error }
        }
      })
    )

    // Log email results
    const successfulEmails = emailResults.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    ).length
    const failedEmails = emailResults.length - successfulEmails

    console.log(
      `Email summary: ${successfulEmails} successful, ${failedEmails} failed`
    )

    if (failedEmails > 0) {
      console.warn(
        'Some invitation emails failed to send:',
        emailResults.filter(
          (result) => result.status === 'rejected' || !result.value.success
        )
      )
    }

    return {
      success: true,
      wageGroup: {
        id: wageGroup.id,
        name: wageGroup.name,
        startDate: wageGroup.startDate.toISOString(),
        paymentDate: wageGroup.paymentDate,
        yieldSource: wageGroup.yieldSource.toLowerCase().replace('_', '-'),
        safeWalletAddress: wageGroup.safeWalletAddress,
        payees: wageGroup.payees.map((payee) => ({
          email: payee.email,
          monthlyAmount: parseFloat(payee.monthlyAmount),
        })),
      },
      emailResults: {
        successful: successfulEmails,
        failed: failedEmails,
        total: emailResults.length,
      },
    }
  } catch (error) {
    console.error('Error creating wage group:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }

    return {
      success: false,
      error: 'Failed to create wage group',
    }
  }
}

export async function updateWageGroupStatus(
  wageGroupId: string,
  isActive: boolean
) {
  try {
    console.log(`Updating wage group ${wageGroupId} status to ${isActive}`)

    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return { success: false, error: auth.error || 'Not authenticated' }
    }

    // Verify user owns this wage group
    const wageGroup = await prisma.wageGroup.findFirst({
      where: {
        id: wageGroupId,
        creatorId: auth.user!.id,
      },
    })

    if (!wageGroup) {
      return { success: false, error: 'Wage group not found or access denied' }
    }

    // Update the wage group status
    const updatedWageGroup = await prisma.wageGroup.update({
      where: { id: wageGroupId },
      data: { isActive },
    })

    console.log('Updated wage group status:', updatedWageGroup.id)

    return {
      success: true,
      wageGroup: {
        id: updatedWageGroup.id,
        isActive: updatedWageGroup.isActive,
      },
    }
  } catch (error) {
    console.error('Error updating wage group status:', error)
    return {
      success: false,
      error: 'Failed to update wage group status',
    }
  }
}

export async function getWageGroups() {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth.isAuthenticated) {
      return { success: false, error: auth.error || 'Not authenticated' }
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

    return {
      success: true,
      wageGroups: wageGroups.map((group) => ({
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
      })),
    }
  } catch (error) {
    console.error('Error fetching wage groups:', error)
    return {
      success: false,
      error: 'Failed to fetch wage groups',
    }
  }
}
