'use client'

import { CheckCircle, Loader2, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { VaultSelector } from './VaultSelector'

interface Payee {
  email: string
  monthlyAmount: string
}

interface WageGroupForm {
  name: string
  startDate: string
  paymentDate: string
  yieldSource: string
  payees: Payee[]
}

interface WageGroupCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateWageGroup: (formData: WageGroupForm) => Promise<void>
  isCreating: boolean
}

export function WageGroupCreateDialog({
  open,
  onOpenChange,
  onCreateWageGroup,
  isCreating,
}: WageGroupCreateDialogProps) {
  const [formData, setFormData] = useState<WageGroupForm>({
    name: '',
    startDate: '',
    paymentDate: '',
    yieldSource: 'none',
    payees: [{ email: '', monthlyAmount: '' }],
  })

  const [showSuccess, setShowSuccess] = useState(false)

  const addPayee = () => {
    setFormData((prev) => ({
      ...prev,
      payees: [...prev.payees, { email: '', monthlyAmount: '' }],
    }))
  }

  const removePayee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      payees: prev.payees.filter((_, i) => i !== index),
    }))
  }

  const updatePayee = (index: number, field: keyof Payee, value: string) => {
    setFormData((prev) => ({
      ...prev,
      payees: prev.payees.map((payee, i) =>
        i === index ? { ...payee, [field]: value } : payee
      ),
    }))
  }

  const handleSubmit = async () => {
    try {
      await onCreateWageGroup(formData)

      // Show success state
      setShowSuccess(true)

      // Reset form
      setFormData({
        name: '',
        startDate: '',
        paymentDate: '',
        yieldSource: 'none',
        payees: [{ email: '', monthlyAmount: '' }],
      })

      // Close dialog after showing success message
      setTimeout(() => {
        setShowSuccess(false)
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      // Handle error case - success state won't show
      console.error('Failed to create wage group:', error)
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) return false
    if (!formData.startDate) return false
    if (
      !formData.paymentDate ||
      parseInt(formData.paymentDate) < 1 ||
      parseInt(formData.paymentDate) > 31
    )
      return false

    for (const payee of formData.payees) {
      if (!payee.email || !payee.monthlyAmount) return false
      if (parseFloat(payee.monthlyAmount) <= 0) return false
    }

    return true
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 z-40"></div>
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto !bg-gradient-to-br !from-purple-50 !via-violet-50/50 !to-white border-purple-100/50 p-0">
          {showSuccess ? (
            // Success State
            <div className="flex flex-col items-center justify-center min-h-[600px] px-6">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-4 mb-6 shadow-lg">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-purple-900 mb-2">
                Successfully Created!
              </h3>
              <p className="text-purple-600/70 text-center max-w-md">
                Your wage group has been set up and invitation emails have been
                sent to all payees.
              </p>
            </div>
          ) : isCreating ? (
            // Loading State
            <div className="flex flex-col items-center justify-center min-h-[600px] px-6">
              <div className="bg-gradient-to-r from-purple-400 to-violet-500 rounded-full p-4 mb-6 shadow-lg">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-semibold text-purple-900 mb-2">
                Setting up your wage group
              </h3>
              <p className="text-purple-600/70 text-center">
                Sending invitation emails to your payees...
              </p>
            </div>
          ) : (
            // Form State
            <>
              <DialogHeader className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-100/50 px-6 py-4">
                <DialogTitle className="text-purple-900">
                  Create Wage Group
                </DialogTitle>
                <DialogDescription className="text-purple-600/70">
                  Set up automated USDC wage payments for your team.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-purple-700 font-medium">
                    Wage Group Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Development Team Q1"
                    className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="startDate"
                      className="text-purple-700 font-medium"
                    >
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      min={getTomorrowDate()}
                      className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="paymentDate"
                      className="text-purple-700 font-medium"
                    >
                      Payment Date (Day of Month)
                    </Label>
                    <Input
                      id="paymentDate"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      placeholder="e.g. 15"
                      className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700 font-medium">
                    Yield Source
                  </Label>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-purple-100/50 p-4">
                    <VaultSelector
                      selectedVault={formData.yieldSource || 'none'}
                      onVaultSelect={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          yieldSource: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-purple-700 font-medium">
                      Payees
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPayee}
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Payee
                    </Button>
                  </div>

                  {formData.payees.map((payee, index) => (
                    <div
                      key={index}
                      className="bg-white/80 backdrop-blur-sm rounded-lg border border-purple-100/50 p-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`email-${index}`}
                            className="text-purple-700 font-medium"
                          >
                            Email Address
                          </Label>
                          <Input
                            id={`email-${index}`}
                            type="email"
                            value={payee.email}
                            onChange={(e) =>
                              updatePayee(index, 'email', e.target.value)
                            }
                            placeholder="payee@example.com"
                            className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`amount-${index}`}
                            className="text-purple-700 font-medium"
                          >
                            Monthly Amount (USDC)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`amount-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={payee.monthlyAmount}
                              onChange={(e) =>
                                updatePayee(
                                  index,
                                  'monthlyAmount',
                                  e.target.value
                                )
                              }
                              placeholder="1000.00"
                              className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                            />
                            {formData.payees.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePayee(index)}
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="bg-gradient-to-r from-purple-500/5 to-violet-500/5 border-t border-purple-100/50 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 min-w-32"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isCreating || !validateForm()}
                  className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isCreating ? 'Setting up...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
