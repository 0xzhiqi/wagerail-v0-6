'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { Navbar } from '@/components/auth/Navbar'
import { checkAuthStatus } from '@/actions/auth'

export default function HomePage() {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const authStatus = await checkAuthStatus()
      setIsAuthenticated(authStatus.isAuthenticated)
      return authStatus.isAuthenticated
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
      return false
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const handleButtonClick = async () => {
    if (isAuthenticated) {
      setIsNavigating(true)
      router.push('/dashboard')
    } else {
      setIsLoginDialogOpen(true)
    }
  }

  const handleLoginSuccess = async () => {
    setIsLoginDialogOpen(false)
    setIsNavigating(true)

    // Re-check auth status and navigate
    const isAuth = await checkAuth()
    if (isAuth) {
      setIsAuthenticated(true)
      router.push('/dashboard')
    } else {
      setIsNavigating(false)
    }
  }

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show navigation loading overlay
  if (isNavigating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Navbar */}
      <Navbar
        onRegisterClick={handleButtonClick}
        showDashboard={isAuthenticated}
      />

      {/* Hero Section */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Salary payments to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  anyone anywhere
                </span>{' '}
                around the world
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                <span className="">Email-enabled USD payments</span> to your
                remote team members and even AI workers
              </p>
            </div>

            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleButtonClick}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : isAuthenticated ? (
                'Dashboard'
              ) : (
                'Get Started'
              )}
            </Button>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden">
              <Image
                src="/images/hero-image.jpeg"
                alt="Hero Image"
                width={600}
                height={400}
                className="w-full h-auto object-cover rounded-3xl shadow-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-purple-50/30 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-purple-600 text-2xl font-medium tracking-wider uppercase mb-4">
              How it works
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              3 simple steps to get your global salary payments flowing
              seamlessly
            </p>
          </div>

          {/* Three Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="group">
              <div className="lg:min-h-[400px] relative bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100/50">
                <div className="absolute top-4 right-4 w-8 h-8 bg-purple-200/60 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 bg-indigo-200/60 rounded-full"></div>

                <div className="flex items-center justify-center h-40">
                  <div className="w-28 h-28 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-20 h-20 text-white"
                      viewBox="0 0 80 80"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="white" opacity="0.95">
                        {/* Person 1 (left) */}
                        <circle cx="28" cy="32" r="5" />
                        <path d="M20 48 C20 44, 23 42, 28 42 C33 42, 36 44, 36 48 L36 52 L20 52 Z" />

                        {/* Person 2 (center, slightly forward) */}
                        <circle cx="40" cy="28" r="6" />
                        <path d="M31 46 C31 41, 35 39, 40 39 C45 39, 49 41, 49 46 L49 52 L31 52 Z" />

                        {/* Person 3 (right) */}
                        <circle cx="52" cy="32" r="5" />
                        <path d="M44 48 C44 44, 47 42, 52 42 C57 42, 60 44, 60 48 L60 52 L44 52 Z" />
                      </g>

                      {/* Email envelope icon (small, top right) */}
                      <g
                        transform="translate(54, 18)"
                        fill="white"
                        opacity="0.8"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="12"
                          height="8"
                          rx="1"
                          stroke="white"
                          strokeWidth="0.5"
                          fill="rgba(255,255,255,0.9)"
                        />
                        <path
                          d="M0 1 L6 5 L12 1"
                          stroke="white"
                          strokeWidth="0.8"
                          fill="none"
                        />
                      </g>

                      {/* Plus sign indicating "add" */}
                      <g
                        transform="translate(18, 18)"
                        fill="white"
                        opacity="0.9"
                      >
                        <circle
                          cx="4"
                          cy="4"
                          r="4"
                          fill="rgba(255,255,255,0.2)"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                        <path
                          d="M2 4 L6 4 M4 2 L4 6"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Step number below image, centered */}
                <div className="flex justify-center mt-4 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Create Payment Group
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Add workers via email and indicate how much to pay them
                    monthly
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group">
              <div className="lg:min-h-[400px] relative bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100/50">
                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-200/60 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-5 h-5 bg-blue-200/60 rounded-full"></div>

                <div className="flex items-center justify-center h-40">
                  <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-20 h-20 text-white"
                      viewBox="0 0 80 80"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="white" opacity="0.95">
                        {/* Main wallet shape */}
                        <rect
                          x="22"
                          y="30"
                          width="36"
                          height="26"
                          rx="4"
                          fill="rgba(255,255,255,0.9)"
                          stroke="white"
                          strokeWidth="1"
                        />
                        <rect
                          x="22"
                          y="30"
                          width="36"
                          height="8"
                          rx="4"
                          fill="white"
                        />

                        {/* Card slot detail */}
                        <rect
                          x="26"
                          y="42"
                          width="12"
                          height="2"
                          rx="1"
                          fill="rgba(99, 102, 241, 0.3)"
                        />
                        <rect
                          x="26"
                          y="46"
                          width="8"
                          height="2"
                          rx="1"
                          fill="rgba(99, 102, 241, 0.3)"
                        />
                      </g>

                      {/* USDC coin */}
                      <g transform="translate(48, 20)">
                        <circle
                          cx="8"
                          cy="8"
                          r="8"
                          fill="white"
                          stroke="rgba(99, 102, 241, 0.3)"
                          strokeWidth="1"
                        />
                        <text
                          x="8"
                          y="11"
                          textAnchor="middle"
                          fontFamily="Arial, sans-serif"
                          fontSize="6"
                          fontWeight="bold"
                          fill="#6366F1"
                        >
                          $
                        </text>
                      </g>

                      {/* Arrow showing transfer into wallet */}
                      <g fill="white" opacity="0.9">
                        <path
                          d="M48 28 L42 34 L48 40"
                          stroke="white"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M46 34 L34 34"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </g>

                      {/* Yield percentage indicator */}
                      <g
                        transform="translate(20, 18)"
                        fill="white"
                        opacity="0.8"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="20"
                          height="8"
                          rx="2"
                          fill="rgba(255,255,255,0.2)"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                        <text
                          x="8"
                          y="5.5"
                          textAnchor="middle"
                          fontFamily="Arial, sans-serif"
                          fontSize="4"
                          fontWeight="bold"
                          fill="white"
                        >
                          60% APY
                        </text>
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Step number below image, centered */}
                <div className="flex justify-center mt-4 mb-4">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Add Funds
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Transfer USDC into your account with the option to earn
                    yields up to{' '}
                    <span className="inline-flex items-center gap-1">
                      60% APY
                      <ExternalLink
                        size={14}
                        className="text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors"
                        onClick={() =>
                          window.open(
                            'https://app.avantprotocol.com/products',
                            '_blank'
                          )
                        }
                      />
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group">
              <div className="lg:min-h-[400px] relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100/50">
                <div className="absolute top-4 right-4 w-7 h-7 bg-emerald-200/60 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-3 h-3 bg-teal-200/60 rounded-full"></div>

                <div className="flex items-center justify-center h-40">
                  <div className="w-28 h-28 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-20 h-20 text-white"
                      viewBox="0 0 80 80"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="white" opacity="0.95">
                        {/* Main circle representing automation center */}
                        <circle
                          cx="40"
                          cy="40"
                          r="12"
                          fill="rgba(255,255,255,0.9)"
                          stroke="white"
                          strokeWidth="1"
                        />

                        {/* Gear/automation symbol in center */}
                        <g transform="translate(40, 40)">
                          <path
                            d="M-4,-6 L-2,-8 L2,-8 L4,-6 L6,-4 L8,-2 L8,2 L6,4 L4,6 L2,8 L-2,8 L-4,6 L-6,4 L-8,2 L-8,-2 L-6,-4 Z"
                            fill="rgba(16, 185, 129, 0.7)"
                            stroke="white"
                            strokeWidth="0.5"
                          />
                          <circle cx="0" cy="0" r="3" fill="white" />
                        </g>
                      </g>

                      {/* Multiple arrows showing automated distribution */}
                      <g
                        fill="white"
                        opacity="0.9"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {/* Arrow to top right */}
                        <path
                          d="M48 32 L58 22 M54 22 L58 22 L58 26"
                          fill="none"
                        />

                        {/* Arrow to right */}
                        <path
                          d="M52 40 L62 40 M58 36 L62 40 L58 44"
                          fill="none"
                        />

                        {/* Arrow to bottom right */}
                        <path
                          d="M48 48 L58 58 M58 54 L58 58 L54 58"
                          fill="none"
                        />

                        {/* Arrow to bottom left */}
                        <path
                          d="M32 48 L22 58 M26 58 L22 58 L22 54"
                          fill="none"
                        />

                        {/* Arrow to left */}
                        <path
                          d="M28 40 L18 40 M22 44 L18 40 L22 36"
                          fill="none"
                        />

                        {/* Arrow to top left */}
                        <path
                          d="M32 32 L22 22 M22 26 L22 22 L26 22"
                          fill="none"
                        />
                      </g>

                      {/* Small worker icons at arrow endpoints */}
                      <g fill="white" opacity="0.8">
                        {/* Top right worker */}
                        <circle cx="58" cy="18" r="2" />
                        <path d="M56 23 C56 22, 57 21, 58 21 C59 21, 60 22, 60 23 L60 25 L56 25 Z" />

                        {/* Right worker */}
                        <circle cx="66" cy="40" r="2" />
                        <path d="M64 45 C64 44, 65 43, 66 43 C67 43, 68 44, 68 45 L68 47 L64 47 Z" />

                        {/* Bottom right worker */}
                        <circle cx="58" cy="62" r="2" />
                        <path d="M56 67 C56 66, 57 65, 58 65 C59 65, 60 66, 60 67 L60 69 L56 69 Z" />

                        {/* Bottom left worker */}
                        <circle cx="22" cy="62" r="2" />
                        <path d="M20 67 C20 66, 21 65, 22 65 C23 65, 24 66, 24 67 L24 69 L20 69 Z" />

                        {/* Left worker */}
                        <circle cx="14" cy="40" r="2" />
                        <path d="M12 45 C12 44, 13 43, 14 43 C15 43, 16 44, 16 45 L16 47 L12 47 Z" />

                        {/* Top left worker */}
                        <circle cx="22" cy="18" r="2" />
                        <path d="M20 23 C20 22, 21 21, 22 21 C23 21, 24 22, 24 23 L24 25 L20 25 Z" />
                      </g>

                      {/* Clock/schedule indicator */}
                      <g
                        transform="translate(26, 26)"
                        fill="white"
                        opacity="0.7"
                      >
                        <circle
                          cx="0"
                          cy="0"
                          r="4"
                          fill="rgba(255,255,255,0.2)"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                        <path
                          d="M0 -2 L0 0 L2 1"
                          stroke="white"
                          strokeWidth="0.8"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Step number below image, centered */}
                <div className="flex justify-center mt-4 mb-4">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Automated Transfers
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    On the salary payment date you set, your workers' salaries
                    will be automatically transferred to them
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose WageRail Section */}
      <section className="bg-gradient-to-br from-purple-50 via-violet-50/50 to-white px-6 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-purple-600 text-2xl font-medium tracking-wider uppercase mb-4">
              Why Choose WageRail
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Enjoy the ease of global salary payments
            </p>
          </div>

          {/* Three Value Props */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Simple */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-purple-50 to-violet-100/80 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100/50 border border-purple-100/50">
                <div className="absolute top-4 right-4 w-6 h-6 bg-purple-200/40 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 bg-violet-200/40 rounded-full"></div>

                <div className="flex items-center justify-center h-32">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Simple</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automated salary payments with just an email address
                </p>
              </div>
            </div>

            {/* Cost Effective */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-violet-50 to-purple-100/80 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100/50 border border-violet-100/50">
                <div className="absolute top-4 right-4 w-5 h-5 bg-violet-200/40 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-7 h-7 bg-purple-200/40 rounded-full"></div>

                <div className="flex items-center justify-center h-32">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Cost Effective
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Monthly subscription without hidden fees or complex costs
                </p>
              </div>
            </div>

            {/* Earn Yields */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-purple-100/80 to-violet-50 rounded-2xl p-8 mb-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100/50 border border-purple-100/50">
                <div className="absolute top-4 right-4 w-8 h-8 bg-purple-200/40 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-3 h-3 bg-violet-200/40 rounded-full"></div>

                <div className="flex items-center justify-center h-32">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Earn Yields
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Maximize your treasury with competitive yields while
                  maintaining full liquidity for payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Dialog */}
      <LoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}
