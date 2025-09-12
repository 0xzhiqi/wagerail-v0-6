'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NameData {
  firstName: string
  middleName: string
  lastName: string
}

interface EditNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNameUpdate?: (nameData: NameData) => void
  initialNameData?: NameData // Add initial data prop
}

export function EditNameDialog({
  open,
  onOpenChange,
  onNameUpdate,
  initialNameData,
}: EditNameDialogProps) {
  const [formData, setFormData] = useState<NameData>({
    firstName: '',
    middleName: '',
    lastName: '',
  })
  const [initialData, setInitialData] = useState<NameData>({
    firstName: '',
    middleName: '',
    lastName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current name data when dialog opens
  useEffect(() => {
    if (open) {
      // If initial data is provided, use it instead of fetching
      if (initialNameData) {
        const nameData = {
          firstName: initialNameData.firstName || '',
          middleName: initialNameData.middleName || '',
          lastName: initialNameData.lastName || '',
        }
        setFormData(nameData)
        setInitialData(nameData)
      } else {
        fetchNameData()
      }
    }
  }, [open, initialNameData])

  const fetchNameData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/user/name', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const nameData = {
          firstName: data.firstName || '',
          middleName: data.middleName || '',
          lastName: data.lastName || '',
        }
        setFormData(nameData)
        setInitialData(nameData)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch name data')
      }
    } catch (error) {
      console.error('Error fetching name data:', error)
      setError('Failed to fetch name data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch('/api/user/name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        onNameUpdate?.(data)
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      setError('Failed to update name')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof NameData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Check if any field has been changed from initial state
  const hasChanges = () => {
    return (
      formData.firstName !== initialData.firstName ||
      formData.middleName !== initialData.middleName ||
      formData.lastName !== initialData.lastName
    )
  }

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
          <h2 className="text-2xl font-semibold text-purple-900">Edit Name</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading name information...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange('firstName', e.target.value)
                  }
                  className="w-full"
                  placeholder="Enter your first name"
                />
              </div>

              {/* Middle Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="middleName"
                  className="text-sm font-medium text-gray-700"
                >
                  Middle Name
                </Label>
                <Input
                  id="middleName"
                  type="text"
                  value={formData.middleName}
                  onChange={(e) =>
                    handleInputChange('middleName', e.target.value)
                  }
                  className="w-full"
                  placeholder="Enter your middle name"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-medium text-gray-700"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange('lastName', e.target.value)
                  }
                  className="w-full"
                  placeholder="Enter your last name"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || !hasChanges()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
