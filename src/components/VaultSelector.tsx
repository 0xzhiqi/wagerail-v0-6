'use client'

import { ExternalLink, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface VaultData {
  name: string
  description: string
  apy: number
  url: string | null
}

interface VaultSelectorProps {
  selectedVault: string
  onVaultSelect: (vault: string) => void
}

export function VaultSelector({
  selectedVault,
  onVaultSelect,
}: VaultSelectorProps) {
  const [vaultData, setVaultData] = useState<Record<string, VaultData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Static vault information
  const vaultInfo = {
    none: {
      name: 'No Yield Source',
      description: 'Standard payments without yield',
      url: null,
    },
    're7-labs': {
      name: 'RE7 Labs',
      description: 'Euler Finance vault',
      url: 'https://app.euler.finance/vault/0x39dE0f00189306062D79eDEC6DcA5bb6bFd108f9?network=avalanche',
    },
    'k3-capital': {
      name: 'K3 Capital',
      description: 'Euler Finance vault',
      url: 'https://app.euler.finance/vault/0x6fC9b3a52944A577cd8971Fd8fDE0819001bC595?network=avalanche',
    },
    'mev-capital': {
      name: 'MEV Capital',
      description: 'Euler Finance vault',
      url: 'https://app.euler.finance/vault/0x69B07dB605d0A08fbE9245c1466880AA36c8E1A7?network=avalanche',
    },
  }

  useEffect(() => {
    console.log('VaultSelector: useEffect triggered!')
    const fetchVaultData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('VaultSelector: Starting APY fetch...')

        // Fetch APY data for all vaults using POST endpoint
        const apiUrl = `/api/vault-apy`
        console.log('VaultSelector: API URL:', apiUrl)

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log('VaultSelector: Response status:', response.status)

        if (!response.ok) {
          throw new Error(`Failed to fetch vault data: ${response.status}`)
        }

        const data = await response.json()
        console.log('VaultSelector: Received data:', data)

        // Transform the API response to match our component's expected format
        const transformedData: Record<string, VaultData> = {}

        // Add "none" option first
        transformedData['none'] = {
          name: vaultInfo['none'].name,
          description: vaultInfo['none'].description,
          apy: 0,
          url: vaultInfo['none'].url,
        }

        // Add vault data with real APY
        if (data.vaults && Array.isArray(data.vaults)) {
          data.vaults.forEach((vault: any) => {
            if (
              vault.vaultId &&
              vaultInfo[vault.vaultId as keyof typeof vaultInfo]
            ) {
              const info = vaultInfo[vault.vaultId as keyof typeof vaultInfo]
              transformedData[vault.vaultId] = {
                name: info.name,
                description: info.description,
                apy: vault.apy || 0,
                url: info.url,
              }
            }
          })
        }

        console.log('VaultSelector: Transformed data:', transformedData)
        setVaultData(transformedData)
        console.log('VaultSelector: APY fetch successful!')
      } catch (error) {
        console.error('VaultSelector: Error fetching vault data:', error)
        console.error('VaultSelector: Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        })
        setError(
          `Failed to fetch real-time APY data. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback data without real-time APY.`
        )

        // Fallback to static data without APY
        const fallbackData: Record<string, VaultData> = {}
        Object.entries(vaultInfo).forEach(([key, info]) => {
          fallbackData[key] = {
            name: info.name,
            description: info.description,
            apy: 0,
            url: info.url,
          }
        })
        console.log('VaultSelector: Using fallback data:', fallbackData)
        setVaultData(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchVaultData()
  }, [])

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-yellow-800">{error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex flex-col justify-center items-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-purple-800">Loading APY data...</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(vaultData).map(([vaultId, vault]) => (
          <VaultOption
            key={vaultId}
            vaultId={vaultId}
            vault={vault}
            isSelected={selectedVault === vaultId}
            onSelect={onVaultSelect}
          />
        ))}
      </div>
    </div>
  )
}

interface VaultOptionProps {
  vaultId: string
  vault: VaultData
  isSelected: boolean
  onSelect: (vaultId: string) => void
}

function VaultOption({
  vaultId,
  vault,
  isSelected,
  onSelect,
}: VaultOptionProps) {
  return (
    <div
      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 min-h-[120px] flex ${
        isSelected
          ? 'border-purple-500 bg-purple-50/50 shadow-md'
          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
      }`}
      onClick={() => onSelect(vaultId)}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 flex flex-col justify-between min-h-[88px]">
          <div>
            <div className="flex items-center space-x-2 mb-1 min-h-[28px]">
              <h4 className="font-semibold text-gray-900">{vault.name}</h4>
              {vault.apy > 0 && (
                <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>{vault.apy.toFixed(2)}% APY</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{vault.description}</p>
          </div>
          <div className="min-h-[28px] flex items-end">
            {vault.url ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-purple-600 hover:text-purple-700"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(vault.url!, '_blank')
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View on Euler Finance
              </Button>
            ) : (
              <div className="h-[20px]" /> // Placeholder to maintain consistent spacing
            )}
          </div>
        </div>
        <div className="flex items-center ml-4">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'border-purple-500 bg-purple-500'
                : 'border-gray-300 bg-white'
            }`}
          >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </div>
      </div>
    </div>
  )
}
