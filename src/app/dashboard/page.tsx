'use client'

import { Coins, LogOut, Mail, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { checkAuthStatus, logoutUser } from '@/actions/auth'

export default function DashboardPage() {
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()

        if (!status.isAuthenticated) {
          router.push('/')
          return
        }

        setAuthStatus(status)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logoutUser()
      // The logoutUser function handles the redirect, but we can add a small delay
      // to ensure the loading state is visible
      setTimeout(() => {
        router.push('/')
      }, 500)
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show logout loading overlay
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Logging out...</p>
        </div>
      </div>
    )
  }

  // If no auth status after loading, show loading (redirect handled in useEffect)
  if (!authStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                {authStatus.user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome to your Dashboard
              </h1>
              <p className="text-gray-600">
                Manage your global salary payments
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </>
            )}
          </Button>
        </div>

        {/* User Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Email Card */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Mail className="h-4 w-4 text-purple-600" />
                <span>Email Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {authStatus.user?.email || 'No email found'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your registered email address
              </p>
            </CardContent>
          </Card>

          {/* Wallet Address Card */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                <span>Wallet Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono text-gray-900 break-all">
                {authStatus.address || 'No wallet address found'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your smart wallet address
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Testnet Faucet Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-purple-600" />
              <span>Testnet Faucet</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  Get test AVAX and USDC tokens
                </p>
                <p className="text-sm text-gray-500">
                  Free testnet tokens with no real value
                </p>
              </div>
              <Button
                onClick={() => router.push('/faucet')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                Getr Tokens
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Payment Groups Coming Soon
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Create payment groups, add team members, and manage automated
                salary payments. This feature will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
