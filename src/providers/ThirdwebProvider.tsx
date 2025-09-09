import { ThirdwebProvider as ThirdwebProviderLib } from 'thirdweb/react'
import { ReactNode } from 'react'

interface ThirdwebProviderProps {
  children: ReactNode
}

export default function ThirdwebProvider({ children }: ThirdwebProviderProps) {
  return <ThirdwebProviderLib>{children}</ThirdwebProviderLib>
}
