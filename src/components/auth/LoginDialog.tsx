'use client'

import { X } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { EmailOtpAuth } from '@/components/auth/EmailOtpAuth'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess?: () => void
}

export function LoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 relative border border-purple-100/50 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 h-8 w-8 p-0 text-purple-400 hover:text-purple-600 hover:bg-purple-100/50 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-200 rounded-t-lg p-6 pr-12">
          <h2 className="text-2xl font-semibold text-purple-900">
            Connect Wallet
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <EmailOtpAuth
            onSuccess={() => {
              onOpenChange(false)
              onLoginSuccess?.()
            }}
            onError={(error) => {
              console.error('Login error:', error)
            }}
          />
        </div>
      </div>
    </div>
  )
}
