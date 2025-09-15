// app/api/wage-group/eerc-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { prisma } from '@/lib/clients/prisma'

export async function PATCH(request: NextRequest) {
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
    const { wageGroupId, eercRegistered } = body

    if (!wageGroupId || typeof eercRegistered !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Verify user owns this wage group
    const wageGroup = await prisma.wageGroup.findFirst({
      where: {
        id: wageGroupId,
        creatorId: auth.user!.id,
      },
    })

    if (!wageGroup) {
      return NextResponse.json(
        { error: 'Wage group not found or access denied' },
        { status: 404 }
      )
    }

    // Update the eERC registration status
    const updatedWageGroup = await prisma.wageGroup.update({
      where: { id: wageGroupId },
      data: { eercRegistered },
    })

    console.log(
      `Updated wage group ${wageGroupId} eERC status to ${eercRegistered}`
    )

    return NextResponse.json({
      success: true,
      wageGroup: {
        id: updatedWageGroup.id,
        eercRegistered: updatedWageGroup.eercRegistered,
      },
    })
  } catch (error) {
    console.error('Error updating eERC status:', error)
    return NextResponse.json(
      { error: 'Failed to update eERC status' },
      { status: 500 }
    )
  }
}
