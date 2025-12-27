'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-800 text-xl">Loading...</div>
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-800 text-xl">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Image 
            src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/t95qed68_fontbolt%20%283%29.png"
            alt="Escape Matrix"
            width={500}
            height={120}
            className="w-auto h-24 md:h-28 object-contain"
            priority
          />
        </div>
        <p className="text-xl text-gray-700">Break free from bad habits. Build your future.</p>
      </div>
      
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none"
            }
          }}
          routing="hash"
        />
      </div>
      
      <div className="mt-8 text-center text-gray-600">
        <p className="text-sm">Sign up with Google to get started</p>
      </div>
    </div>
  )
}
