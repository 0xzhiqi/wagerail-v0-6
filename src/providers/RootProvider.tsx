'use client'

import { ReactNode } from 'react'

import TanstackProvider from './TanstackProvider'
import ThirdwebProvider from './ThirdwebProvider'

interface RootProviderProps {
  children: ReactNode
}

export default function RootProvider({ children }: RootProviderProps) {
  return (
    <TanstackProvider>
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </TanstackProvider>
  )
}
