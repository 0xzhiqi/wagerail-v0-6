'use client'

import {
  Mail,
  Pencil,
  Shield,
  ShieldCheck,
  User,
  UserCircle,
  Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfileSectionProps {
  authStatus: any
  nameData: {
    firstName: string
    middleName: string
    lastName: string
  }
  loadingNameData: boolean
  eercRegistered: boolean | null
  loadingEercStatus: boolean
  onEditNameClick: () => void
}

export function ProfileSection({
  authStatus,
  nameData,
  loadingNameData,
  eercRegistered,
  loadingEercStatus,
  onEditNameClick,
}: ProfileSectionProps) {
  const router = useRouter()

  const formatDisplayName = (
    firstName: string,
    middleName: string,
    lastName: string
  ) => {
    const nameParts = [firstName, middleName, lastName].filter(
      (part) => part && part.trim()
    )
    return nameParts.length > 0 ? nameParts.join(' ') : 'No name set yet'
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCircle className="h-5 w-5 text-purple-600" />
          <span>Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Section */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Name</span>
            </div>
            {loadingNameData ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <div className="text-sm font-semibold text-gray-900">
                {formatDisplayName(
                  nameData.firstName,
                  nameData.middleName,
                  nameData.lastName
                )}
              </div>
            )}
          </div>
          <div className="flex items-center">
            {loadingNameData ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <Button
                size="sm"
                onClick={onEditNameClick}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 w-24"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Update
              </Button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Email Section */}
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">
                Email Address
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {authStatus.user?.email || 'No email found'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Wallet Section */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Wallet className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">
                Wallet Address
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900 break-all">
              {authStatus.address || 'No wallet address found'}
            </div>
          </div>
          <div className="flex items-center ml-4">
            {loadingEercStatus ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : eercRegistered ? (
              <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">eERC Registered</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => router.push('/eerc-registration')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 w-24"
              >
                <Shield className="h-3 w-3 mr-0" />
                Register
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
