'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { CheckCircle, Target, TrendingUp } from 'lucide-react'
import Image from 'next/image'

const onboardingSteps = [
  {
    eyebrow: 'Strategic clarity',
    title: 'Track Habits Daily',
    description:
      'What you dont track, you dont improve !',
  },
  {
    eyebrow: 'Momentum that compounds',
    title: 'Crush Deadlines',
    description:
      'Crush deadlines with daily habit tracking and progress monitoring.',
  },
]

const highlightChips = [
  { icon: CheckCircle, label: 'Daily Checks' },
  { icon: TrendingUp, label: 'Progress' },
]

const featureVisuals = [
  {
    src: 'https://res.cloudinary.com/dp8k9xyhd/video/upload/v1767311571/habitdaily_spvyj1.mp4',
    alt: 'Daily habit tracking preview',
    caption: '',
  },
  {
    src: 'https://res.cloudinary.com/dp8k9xyhd/video/upload/v1767311560/tasks_svvxhh.mp4',
    alt: 'Task management preview',
    caption: '',
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const run = async () => {
      try {
        const res = await fetch(`/api/pro-status?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const { isPro } = await res.json()
        if (isPro) {
          router.replace('/habits')
        }
      } catch {
        // ignore
      }
    }

    run()
  }, [isLoaded, isSignedIn, router])

  const isFinalStep = currentStep === onboardingSteps.length - 1

  const handleAdvance = () => {
    if (isFinalStep) {
      localStorage.setItem('onboarding_completed', 'true')
      router.push('/pro')
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, onboardingSteps.length - 1))
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const step = onboardingSteps[currentStep]
  const featureVisual = featureVisuals[currentStep] ?? featureVisuals[0]

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <div className="w-full lg:max-w-lg bg-white flex flex-col justify-between px-8 py-10 sm:px-12 lg:px-14 lg:py-14 shadow-2xl z-10">
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <Image
              src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/t95qed68_fontbolt%20%283%29.png"
              alt="Escape Matrix"
              width={180}
              height={48}
              className="w-auto h-10 object-contain"
            />
            {/* <div className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase">workspace</div> */}
          </div>

          <div className="hidden lg:block space-y-6">
            <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{`Feature ${String(currentStep + 1).padStart(2, '0')}`}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.45em]">{step.eyebrow}</p>
            <h1 className="text-3xl sm:text-[34px] font-semibold text-slate-900 leading-tight">{step.title}</h1>
            <p className="text-base text-slate-600 leading-relaxed">{step.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-2">
            {onboardingSteps.map((_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full flex-1 transition-colors duration-300 ${
                  index <= currentStep ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleAdvance}
            size="lg"
            className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-lg font-semibold tracking-wide"
          >
            {isFinalStep ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <Image
          src="/bg/image.png"
          alt="Modern workspace"
          fill
          priority
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-slate-950/20 via-slate-950/40 to-slate-950/80" />
        <div className="absolute inset-0 pointer-events-none flex justify-center items-start p-6 sm:p-10 lg:p-16" style={{paddingTop: 'calc(10% + 6rem)'}}>
          <div className="w-[18.4rem] sm:w-[23rem] lg:w-[27.6rem] xl:w-[32.2rem] aspect-[4/3] rounded-[32px] bg-white/90 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.5)] backdrop-blur-md border border-white/60 p-3 animate-in slide-in-from-top duration-500 scale-110">
            <div className="relative w-full h-full rounded-[26px] overflow-hidden">
              <video
                src={featureVisual.src}
                alt={featureVisual.alt}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 lg:p-16 text-white">
          <p className="hidden lg:block text-sm uppercase tracking-[0.6em] text-white/80 mb-4">Build Habits</p>
          <h2 className="text-3xl lg:text-4xl font-semibold leading-tight mb-6 max-w-xl">
            Track every habit !
          </h2>
          <div className="hidden lg:flex flex-wrap gap-3">
            {highlightChips.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-medium"
              >
                <Icon className="w-4 h-4" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
