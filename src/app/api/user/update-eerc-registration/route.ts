import { NextRequest, NextResponse } from 'next/server'
import { updateEercRegistrationStatus } from '@/actions/user'

export async function POST(request: NextRequest) {
  try {
    const result = await updateEercRegistrationStatus()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error updating EERC registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
