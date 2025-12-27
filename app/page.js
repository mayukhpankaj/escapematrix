'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
      if (hasCompletedOnboarding === 'true') {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Escape Matrix</h1>
        <p className="text-xl text-purple-200">Break free from bad habits. Build your future.</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none"
            }
          }}
          routing="path"
          path="/"
        />
      </div>
      
      <div className="mt-8 text-center text-purple-200">
        <p className="text-sm">Sign in with Google to get started</p>
      </div>
    </div>
  )
}
