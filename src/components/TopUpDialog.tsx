'use client'

import { Wallet } from 'lucide-react'
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

  if (!wageGroup) return null

  const monthlyTotal = calculateMonthlyTotal()
  const suggestedAmounts = [
    monthlyTotal,
    monthlyTotal * 2,
    monthlyTotal * 3,
    monthlyTotal * 6,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-50 via-violet-50/50 to-white border-purple-100/50">
        <DialogHeader className="text-center">
          <div className="mx-auto bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full p-3 w-fit mb-4">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-purple-900">
            Add Funds to {wageGroup.name}
          </DialogTitle>
          <DialogDescription className="text-purple-600/70">
            Top up your payment group with USDC tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              {suggestedAmounts.map((suggestedAmount, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(suggestedAmount.toString())}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                  disabled={isLoading}
                >
                  ${suggestedAmount.toFixed(0)}
                  <span className="text-xs ml-1">
                    ({index + 1} month{index !== 0 ? 's' : ''})
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 text-center">
              💡 Wallet integration coming soon! This will connect to your
              wallet for USDC transfers.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTopUp}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
