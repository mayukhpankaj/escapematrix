'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { CheckCircle, Target, TrendingUp } from 'lucide-react'
import Image from 'next/image'

const onboardingSteps = [
  {
    icon: Target,
    title: 'Track Your Goals',
    description: 'Set both short-term and long-term goals. Build habits that stick with daily tracking and progress monitoring.',
  },
  {
    icon: CheckCircle,
    title: 'Eisenhower Matrix',
    description: 'Prioritize tasks using the proven Eisenhower Matrix. Focus on what truly matters: urgent vs important.',
  },
  {
    icon: TrendingUp,
    title: 'Build Momentum',
    description: 'Create repeating tasks, set custom schedules, and watch your progress grow. Escape the matrix of bad habits.',
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    }
  }, [isSignedIn, isLoaded, router])

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      localStorage.setItem('onboarding_completed', 'true')
      router.push('/dashboard')
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const step = onboardingSteps[currentStep]
  const Icon = step.icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo at top */}
        <div className="flex justify-center mb-8">
          <Image 
            src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/v884ubv2_fontbolt%20%282%29.png"
            alt="Escape Matrix"
            width={300}
            height={80}
            className="w-auto h-16 brightness-0 invert"
          />
        </div>

        {/* Main content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-6 bg-black rounded-full p-6">
              <Icon className="w-16 h-16 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-8 max-w-md">
              {step.description}
            </p>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-3 mb-8">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            size="lg"
            className="bg-black hover:bg-gray-800 text-white font-semibold px-12 py-6 text-lg rounded-full shadow-lg"
          >
            {currentStep < onboardingSteps.length - 1 ? 'Next' : 'Get Started'}
          </Button>
        </div>
      </div>
    </div>
  )
}
