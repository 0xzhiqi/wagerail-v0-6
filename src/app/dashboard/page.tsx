'use client'

import { Droplet, LogOut, Menu } from 'lucide-react'
import { useActiveAccount, useConnect } from 'thirdweb/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
import { EditNameDialog } from '@/components/EditNameDialog'
import { PaymentGroupsSection } from '@/components/PaymentGroupsSection'
import { ProfileSection } from '@/components/ProfileSection'
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
  const router = useRouter()
  const account = useActiveAccount()
  const { connect } = useConnect()

  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [wageGroups, setWageGroups] = useState<WageGroup[]>([])
  const [loadingWageGroups, setLoadingWageGroups] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTopUpDialog, setShowTopUpDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [selectedWageGroup, setSelectedWageGroup] = useState<WageGroup | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [eercRegistered, setEercRegistered] = useState<boolean | null>(null)
  const [loadingEercStatus, setLoadingEercStatus] = useState(false)
  const [nameData, setNameData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
  })
  const [loadingNameData, setLoadingNameData] = useState(false)

  // Wallet connection state management (similar to FaucetPage)
  const [isWalletLoading, setIsWalletLoading] = useState(true)
  const [walletReconnectAttempted, setWalletReconnectAttempted] =
    useState(false)

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

  // Auto-reconnect wallet on page load (same as FaucetPage)
  useEffect(() => {
    const attemptWalletReconnect = async () => {
      if (walletReconnectAttempted) return

      try {
        const { thirdwebWallet } = await import('@/lib/clients/thirdweb-wallet')
        const { thirdwebClient } = await import('@/lib/clients/thirdweb-client')

        console.log('Attempting dashboard wallet auto-reconnect...')
        await thirdwebWallet.autoConnect({ client: thirdwebClient })
        console.log(
          'After autoConnect, wallet account:',
          thirdwebWallet.getAccount()
        )

        if (thirdwebWallet.getAccount()) {
          console.log('Connecting wallet...')
          await connect(async () => thirdwebWallet)
          console.log('Dashboard wallet reconnected successfully')
        }
      } catch (error) {
        console.log('Dashboard wallet auto-reconnect failed:', error)
      } finally {
        setWalletReconnectAttempted(true)
      }
    }

    attemptWalletReconnect()
  }, [connect, walletReconnectAttempted])

  // Handle wallet loading state (same as FaucetPage)
  useEffect(() => {
    if (!walletReconnectAttempted) return

    // Give the wallet some time to initialize
    const timer = setTimeout(() => {
      setIsWalletLoading(false)
    }, 2000) // 2 second timeout

    // If account is available, stop loading immediately
    if (account?.address) {
      console.log(
        'Account address detected, stopping wallet loading:',
        account.address
      )
      setIsWalletLoading(false)
      clearTimeout(timer)
    }

    return () => clearTimeout(timer)
  }, [account?.address, walletReconnectAttempted])

  useEffect(() => {
    if (authStatus?.isAuthenticated) {
      fetchWageGroups()
      fetchEercStatus()
      fetchNameData()
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

  const fetchNameData = async () => {
    try {
      setLoadingNameData(true)
      const response = await fetch('/api/user/name', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNameData({
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
        })
      } else {
        console.error('Failed to fetch name data:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching name data:', error)
    } finally {
      setLoadingNameData(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logoutUser()
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
        await fetchWageGroups()
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
        await fetchWageGroups()
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

  const handleNameUpdate = (updatedNameData: {
    firstName: string
    middleName: string
    lastName: string
  }) => {
    setNameData(updatedNameData)
  }

  const handleStatusToggleClick = (group: WageGroup) => {
    setSelectedWageGroup(group)
    setShowStatusDialog(true)
  }

  const handleTopUpClick = (group: WageGroup) => {
    setSelectedWageGroup(group)
    setShowTopUpDialog(true)
  }

  const handleEditNameClick = () => {
    setShowEditNameDialog(true)
  }

  const handleCreateClick = () => {
    setShowCreateDialog(true)
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

  // Determine the account to pass to TopUpDialog
  // Only pass account if wallet reconnection is complete and account exists
  const connectedAccount =
    !isWalletLoading && walletReconnectAttempted && account?.address
      ? account
      : null
  console.log(
    'Dashboard rendering, connectedAccount address:',
    connectedAccount?.address
  )

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

        {/* Profile Section */}
        <ProfileSection
          authStatus={authStatus}
          nameData={nameData}
          loadingNameData={loadingNameData}
          eercRegistered={eercRegistered}
          loadingEercStatus={loadingEercStatus}
          onEditNameClick={handleEditNameClick}
        />

        {/* Payment Groups Section */}
        <PaymentGroupsSection
          authStatus={authStatus}
          wageGroups={wageGroups}
          loadingWageGroups={loadingWageGroups}
          onCreateClick={handleCreateClick}
          onStatusToggleClick={handleStatusToggleClick}
          onTopUpClick={handleTopUpClick}
        />
      </div>

      {/* Dialogs */}
      <WageGroupCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateWageGroup={handleCreateWageGroup}
        isCreating={isCreating}
      />

      {/* Pass connectedAccount to TopUpDialog - only when wallet is properly connected */}
      <TopUpDialog
        open={showTopUpDialog}
        onOpenChange={setShowTopUpDialog}
        wageGroup={selectedWageGroup}
        account={connectedAccount} // This will be null until wallet is properly connected
      />

      <EditNameDialog
        open={showEditNameDialog}
        onOpenChange={setShowEditNameDialog}
        onNameUpdate={handleNameUpdate}
        initialNameData={nameData}
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
