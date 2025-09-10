'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  onRegisterClick?: () => void
  showDashboard?: boolean
}

export function Navbar({ onRegisterClick, showDashboard }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between pt-4 px-6 bg-slate-50 backdrop-blur-sm">
      <Link href="/" className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="cursor-pointer object-contain max-h-16 "
          priority
        />
      </Link>

      <Button
        variant="outline"
        size="lg"
        className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 px-8 py-3 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        onClick={onRegisterClick}
      >
        {showDashboard ? 'Dashboard' : 'Register'}
      </Button>
    </nav>
  )
}
