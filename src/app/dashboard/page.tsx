'use client'

import {
  BanknoteArrowUp,
  Droplet,
  Group,
  LogOut,
  Mail,
  Menu,
  Plus,
  Power,
  Shield,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TopUpDialog } from '@/components/TopUpDialog'
import { WageGroupCreateDialog } from '@/components/WageGroupCreateDialog'
import { checkAuthStatus, logoutUser } from '@/actions/auth'
import { createWageGroup, updateWageGroupStatus } from '@/actions/wage-group'

interface WageGroup {
  id: string
  name: string
  startDate: string
  paymentDate: number
  yieldSource: string
  eercRegistered: boolean
  isActive: boolean
  payees: Array<{
    email: string
    monthlyAmount: number
  }>
}

export default function DashboardPage() {
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [wageGroups, setWageGroups] = useState<WageGroup[]>([])
  const [loadingWageGroups, setLoadingWageGroups] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTopUpDialog, setShowTopUpDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [selectedWageGroup, setSelectedWageGroup] = useState<WageGroup | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [eercRegistered, setEercRegistered] = useState<boolean | null>(null)
  const [loadingEercStatus, setLoadingEercStatus] = useState(false)
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

  useEffect(() => {
    if (authStatus?.isAuthenticated) {
      fetchWageGroups()
      fetchEercStatus()
    }
  }, [authStatus])

  const fetchWageGroups = async () => {
    try {
      setLoadingWageGroups(true)
      const response = await fetch('/api/wage-group', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setWageGroups(data.wageGroups || [])
      } else {
        console.error('Failed to fetch wage groups:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching wage groups:', error)
    } finally {
      setLoadingWageGroups(false)
    }
  }

  const fetchEercStatus = async () => {
    try {
      setLoadingEercStatus(true)
      const response = await fetch('/api/user/eerc-registration-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEercRegistered(data.eercRegistered)
      } else {
        console.error('Failed to fetch eERC status:', response.statusText)
        setEercRegistered(false)
      }
    } catch (error) {
      console.error('Error fetching eERC status:', error)
      setEercRegistered(false)
    } finally {
      setLoadingEercStatus(false)
    }
  }

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

  const handleCreateWageGroup = async (formData: any) => {
    try {
      setIsCreating(true)
      const result = await createWageGroup(formData)

      if (result.success) {
        await fetchWageGroups() // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to create wage group')
      }
    } catch (error) {
      console.error('Error creating wage group:', error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  const handleStatusToggle = async () => {
    if (!selectedWageGroup) return

    try {
      setIsUpdatingStatus(true)
      const result = await updateWageGroupStatus(
        selectedWageGroup.id,
        !selectedWageGroup.isActive
      )

      if (result.success) {
        await fetchWageGroups() // Refresh the list
        setShowStatusDialog(false)
        setSelectedWageGroup(null)
      } else {
        console.error('Failed to update status:', result.error)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdatingStatus(false)
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

          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/faucet')}
                className="flex items-center space-x-2"
              >
                <Droplet className="h-4 w-4" />
                <span>Testnet Faucet</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Email Card */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Mail className="h-4 w-4 text-purple-600" />
                <span className="font-bold">Email Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg text-gray-900">
                {authStatus.user?.email || 'No email found'}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Address Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                <span className="font-bold">Wallet Address</span>
              </CardTitle>

              {/* eERC Registration Status */}
              <div className="flex items-center space-x-2">
                {loadingEercStatus ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                ) : eercRegistered ? (
                  <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">eERC Registered</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => router.push('/eerc-registration')}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-xs h-7"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Register Wallet
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg text-gray-900 break-all">
                {authStatus.address || 'No wallet address found'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wage Payment Groups Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <BanknoteArrowUp className="h-5 w-5 text-purple-600" />
                <span>Payment Groups</span>
              </CardTitle>
              <Button
                onClick={() => setShowCreateDialog(true)}
                disabled={!authStatus?.address}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingWageGroups ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payment groups...</p>
              </div>
            ) : wageGroups.length > 0 ? (
              <div className="grid gap-6">
                {wageGroups.map((group) => (
                  <div
                    key={group.id}
                    className="relative bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-6 border border-purple-100/50 hover:shadow-lg hover:shadow-purple-100/30 transition-all duration-300 group"
                  >
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4 w-6 h-6 bg-purple-200/30 rounded-full"></div>
                    <div className="absolute bottom-4 left-4 w-4 h-4 bg-indigo-200/30 rounded-full"></div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        {/* Header with gradient accent */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                            <h4 className="font-bold text-gray-900 text-xl">
                              {group.name}
                            </h4>
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Payment Date */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                                Payment Date
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {group.paymentDate}
                              {group.paymentDate === 1
                                ? 'st'
                                : group.paymentDate === 2
                                  ? 'nd'
                                  : group.paymentDate === 3
                                    ? 'rd'
                                    : 'th'}{' '}
                              of each month
                            </p>
                          </div>

                          {/* Start Date */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                                Started
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {new Date(group.startDate).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Yield Source */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                                Yield Source
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {group.yieldSource === 're7-labs'
                                ? 'RE7 Labs'
                                : group.yieldSource === 'k3-capital'
                                  ? 'K3 Capital'
                                  : group.yieldSource === 'mev-capital'
                                    ? 'MEV Capital'
                                    : 'None'}
                            </p>
                          </div>

                          {/* Active Status */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div
                                    className={`w-2 h-2 rounded-full ${group.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                                  ></div>
                                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Active Status
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 flex items-center space-x-1">
                                  <span>
                                    {group.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </p>
                              </div>
                              {/* Status Toggle Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedWageGroup(group)
                                  setShowStatusDialog(true)
                                }}
                                className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
                                  group.isActive
                                    ? 'text-green-600 hover:bg-green-100 hover:text-green-700'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                }`}
                                title={
                                  group.isActive
                                    ? 'Deactivate payment group'
                                    : 'Activate payment group'
                                }
                              >
                                <Power size={16} />
                              </Button>
                            </div>
                          </div>

                          {/* EERC Status */}
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50 md:col-span-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-2 h-2 rounded-full ${group.eercRegistered ? 'bg-green-500' : 'bg-yellow-500'}`}
                              ></div>
                              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                EERC Status
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {group.eercRegistered
                                ? 'EERC Registered'
                                : 'Pending Registration'}
                            </p>
                          </div>
                        </div>

                        {/* Payees List */}
                        {group.payees && group.payees.length > 0 && (
                          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                <span>
                                  Team Members ({group.payees.length})
                                </span>
                              </h5>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {group.payees.map((payee, payeeIndex) => (
                                <div
                                  key={payeeIndex}
                                  className="flex justify-between items-center py-1"
                                >
                                  <span className="text-sm text-gray-700 font-medium">
                                    {payee.email}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 bg-white/60 px-2 py-1 rounded-md">
                                    ${payee.monthlyAmount} USDC
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side - Summary & Action */}
                      <div className="ml-6 text-right space-y-4">
                        {/* Summary Card */}
                        <div className="relative bg-gradient-to-br from-purple-100/60 via-violet-100/50 to-indigo-100/40 rounded-xl p-5 shadow-lg min-w-[180px] border border-purple-200/50">
                          {/* Subtle decorative elements */}
                          <div className="absolute top-2 right-2 w-6 h-6 bg-purple-100/40 rounded-full"></div>
                          <div className="absolute bottom-2 left-2 w-3 h-3 bg-indigo-200/40 rounded-full"></div>

                          {/* Content */}
                          <div className="relative space-y-3">
                            {/* Header with icon */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs uppercase tracking-wider text-purple-600 font-semibold flex items-center space-x-2">
                                <svg
                                  className="w-4 h-4 text-purple-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>Monthly Total</span>
                              </div>
                            </div>

                            {/* Amount display */}
                            <div className="space-y-1">
                              <div className="text-3xl font-black text-gray-900 tracking-tight">
                                $
                                {group.payees
                                  ?.reduce(
                                    (sum, payee) => sum + payee.monthlyAmount,
                                    0
                                  )
                                  .toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-purple-600 font-medium">
                                USDC per month
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-purple-200/50"></div>

                            {/* Team info */}
                            <div className="flex items-center justify-end text-xs">
                              <span className="text-gray-700 font-medium">
                                {group.payees?.length || 0} team member
                                {(group.payees?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Subtle overlay effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 to-transparent rounded-xl pointer-events-none"></div>
                        </div>

                        {/* Enhanced Top Up Button */}
                        <button
                          className="group/btn relative w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
                          onClick={() => {
                            setSelectedWageGroup(group)
                            setShowTopUpDialog(true)
                          }}
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>

                          {/* Button content */}
                          <div className="relative flex items-center justify-center space-x-2">
                            <svg
                              className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-200"
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
                            <span className="text-sm font-bold">Add Funds</span>
                          </div>

                          {/* Subtle shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Group className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900mb-2">
                  No payment groups yet
                </h4>
                <p className="text-gray-500 mb-6">
                  Create your first payment group to get started with automated
                  wage payments.
                </p>
                {!authStatus?.address && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 inline-block">
                    Please authenticate your wallet first to create payment
                    groups.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <WageGroupCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateWageGroup={handleCreateWageGroup}
        isCreating={isCreating}
      />

      <TopUpDialog
        open={showTopUpDialog}
        onOpenChange={setShowTopUpDialog}
        wageGroup={selectedWageGroup}
      />

      {/* Status Toggle Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedWageGroup?.isActive ? 'Deactivate' : 'Activate'} Payment
              Group
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{' '}
              {selectedWageGroup?.isActive ? 'deactivate' : 'activate'} "
              {selectedWageGroup?.name}"?
              {selectedWageGroup?.isActive &&
                ' This will stop all automatic payments.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false)
                setSelectedWageGroup(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusToggle}
              disabled={isUpdatingStatus}
              className={
                selectedWageGroup?.isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {isUpdatingStatus
                ? 'Updating...'
                : selectedWageGroup?.isActive
                  ? 'Deactivate'
                  : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-200 rounded-t-lg p-6 -m-6 mb-6">
            <DialogTitle className="text-2xl font-semibold text-purple-900">
              Confirm Logout
            </DialogTitle>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <DialogDescription className="text-gray-600">
              You will need to authenticate again to access your dashboard.
            </DialogDescription>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Logging out...</span>
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
