'use client'

import { Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WageGroup {
  id: string
  name: string
  payees: Array<{
    email: string
    monthlyAmount: number
  }>
}

interface TopUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wageGroup: WageGroup | null
}

export function TopUpDialog({
  open,
  onOpenChange,
  wageGroup,
}: TopUpDialogProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const calculateMonthlyTotal = () => {
    if (!wageGroup?.payees) return 0
    return wageGroup.payees.reduce((sum, payee) => sum + payee.monthlyAmount, 0)
  }

  const handleTopUp = async () => {
    if (!wageGroup || !amount || parseFloat(amount) <= 0) return

    try {
      setIsLoading(true)
      // TODO: Implement actual top-up functionality
      // This would involve connecting to wallet and making USDC transfer
      console.log('Top up functionality not yet implemented')

      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Reset form and close dialog
      setAmount('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error during top-up:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open || !wageGroup) return null

  const monthlyTotal = calculateMonthlyTotal()
  // Updated to 1, 2, 3, 6 months
  const suggestedAmounts = [
    { months: 1, amount: monthlyTotal },
    { months: 2, amount: monthlyTotal * 2 },
    { months: 3, amount: monthlyTotal * 3 },
    { months: 6, amount: monthlyTotal * 6 },
  ]

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
          <div className="mx-auto bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-3 w-fit mb-4">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-purple-900 text-center">
            Add Funds to {wageGroup.name}
          </h2>
          <p className="text-purple-600/70 text-center mt-2">
            Top up your payment group account with USDC
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Monthly Total Info */}
            <div className="bg-purple-50/50 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-600 mb-1">
                Monthly Payment Total
              </p>
              <p className="text-2xl font-bold text-purple-900">
                ${monthlyTotal.toFixed(2)} USDC
              </p>
              <p className="text-xs text-purple-500 mt-1">
                {wageGroup.payees.length} team member
                {wageGroup.payees.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-purple-700 font-medium">
                Amount to Add (USDC)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-400 text-lg"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label className="text-purple-700 font-medium text-sm">
                Quick Amounts
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {suggestedAmounts.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(suggestion.amount.toString())}
                    className="border-purple-200 text-purple-700 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300"
                    disabled={isLoading}
                  >
                    ${suggestion.amount.toFixed(0)}
                    <span className="text-xs ml-1">
                      ({suggestion.months} month
                      {suggestion.months !== 1 ? 's' : ''})
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6">
            <Button
              onClick={handleTopUp}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="bg-gradient-to-r w-full from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Funds...
                </>
              ) : (
                `Add $${amount || '0'} USDC`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
