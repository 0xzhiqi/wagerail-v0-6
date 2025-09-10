import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-gray-50 px-6 py-12">
      <div className="max-w-7xl mx-auto text-center space-y-2">
        <a href="/" className="flex items-center justify-center space-x-2">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={30}
            height={30}
            className="cursor-pointer"
          />
        </a>

        <div className="flex justify-center space-x-8 text-sm text-gray-600">
          {/* Navigation links can be added here */}
        </div>

        <p className="text-xs text-gray-500">© 2025 WageRail</p>
      </div>
    </footer>
  )
}