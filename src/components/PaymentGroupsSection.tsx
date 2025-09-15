'use client'

import { BanknoteArrowUp, Group, Plus, Power, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WageGroup {
  id: string
  name: string
  startDate: string
  paymentDate: number
  yieldSource: string
  eercRegistered: boolean
  isActive: boolean
  safeWalletAddress?: string
  payees: Array<{
    email: string
    monthlyAmount: number
  }>
}

interface PaymentGroupsSectionProps {
  authStatus: any
  wageGroups: WageGroup[]
  loadingWageGroups: boolean
  onCreateClick: () => void
  onStatusToggleClick: (group: WageGroup) => void
  onWalletClick: (group: WageGroup) => void
}

export function PaymentGroupsSection({
  authStatus,
  wageGroups,
  loadingWageGroups,
  onCreateClick,
  onStatusToggleClick,
  onWalletClick,
}: PaymentGroupsSectionProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BanknoteArrowUp className="h-5 w-5 text-purple-600" />
            <span>Payment Groups</span>
          </CardTitle>
          <Button
            size="sm"
            onClick={onCreateClick}
            disabled={!authStatus?.address}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Plus className="w-3 h-3 mr-1" />
            Create
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
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
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
                          <div
                            className={`w-2 h-2 rounded-full ${
                              new Date() >= new Date(group.startDate)
                                ? 'bg-emerald-500'
                                : 'bg-gray-400'
                            }`}
                          ></div>
                          <span
                            className={`text-xs font-medium uppercase tracking-wide ${
                              new Date() >= new Date(group.startDate)
                                ? 'text-emerald-600'
                                : 'text-gray-600'
                            }`}
                          >
                            Start Date
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
                              <span
                                className={`text-xs font-medium uppercase tracking-wide ${
                                  group.isActive
                                    ? 'text-green-600'
                                    : 'text-gray-600'
                                }`}
                              >
                                Payment Status
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
                            onClick={() => onStatusToggleClick(group)}
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
                    </div>

                    {/* Payees List */}
                    {group.payees && group.payees.length > 0 && (
                      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span>Team Members ({group.payees.length})</span>
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
                  <div className="ml-6 text-right space-y-4 flex flex-col items-end">
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

                    {/* Enhanced Wallet Button - Right aligned */}
                    <button
                      className="group/btn relative w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center overflow-hidden"
                      onClick={() => onWalletClick(group)}
                    >
                      {/* Animated background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 origin-left"></div>

                      {/* Icon */}
                      <Wallet className="relative w-5 h-5 group-hover/btn:scale-110 transition-transform duration-200 z-10" />

                      {/* Shimmer effect */}
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
              Create your first payment group to get started with automated wage
              payments.
            </p>
            {!authStatus?.address && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 inline-block">
                Please authenticate your wallet first to create payment groups.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
