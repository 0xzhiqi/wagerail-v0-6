import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { tanstackQueryClient } from '@/lib/clients'

interface TanstackProviderProps {
  children: ReactNode
}

export default function TanstackProvider({ children }: TanstackProviderProps) {
  return (
    <QueryClientProvider client={tanstackQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
