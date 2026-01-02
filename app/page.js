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
    if (!isLoaded || !isSignedIn) return

    const checkProStatus = async () => {
      try {
        const maxAttempts = 3

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const response = await fetch(`/api/pro-status?t=${Date.now()}`, {
            cache: 'no-store',
          })

          if (!response.ok) {
            if (attempt === maxAttempts) {
              throw new Error('Unable to verify pro status')
            }
            await new Promise((r) => setTimeout(r, 250 * attempt))
            continue
          }

          const { isPro } = await response.json()

          if (isPro) {
            router.replace('/habits')
          } else {
            router.replace('/onboarding')
          }

          return
        }
      } catch (error) {
        console.error('Error checking pro status:', error)
        router.replace('/onboarding')
      }
    }

    checkProStatus()
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded || isSignedIn) {
    const isLoading = !isLoaded
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
        <Image
          src="/logo/logo-white.png"
          alt="Escape Matrix"
          width={240}
          height={80}
          priority
          className={`w-48 sm:w-60 h-auto object-contain ${isLoading ? 'animate-logo-glow' : ''}`}
        />
        <style jsx>{`
          @keyframes logoGlow {
            0% {
              opacity: 0.6;
              filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.25));
            }
            50% {
              opacity: 1;
              filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.5));
            }
            100% {
              opacity: 0.6;
              filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.25));
            }
          }

          .animate-logo-glow {
            animation: logoGlow 2.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      <Image
        src="/bg/image.png"
        alt="Modern workspace"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/40" />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <div className="hidden lg:flex flex-1 px-8 sm:px-12 lg:px-16 py-16 text-white flex-col justify-between">
          <div className="space-y-8 max-w-2xl">
            <Image
              src="/logo/logo-white.png"
              alt="Escape Matrix"
              width={240}
              height={80}
              className="w-84 h-auto object-contain"
              priority
            />
            <div className="space-y-4">
              {/* <p className="text-sm uppercase tracking-[0.65em] text-white/70">Welcome back</p> */}
              <h1 className="text-4xl sm:text-[46px] font-semibold leading-tight">
                Conquer 2026<br />Execute with clarity.
              </h1>
       
            </div>
          </div>

          <div className="hidden lg:flex gap-6 text-sm text-white/80 uppercase tracking-[0.4em]">
            <span>Plan</span>
            <span>Act</span>
            <span>Achieve</span>
          </div>
        </div>

        <div className="order-first lg:order-none w-full max-w-md lg:max-w-lg mx-auto lg:mx-0 mt-10 lg:mt-0 px-6 sm:px-10 lg:px-12 py-10 lg:py-12 flex flex-col gap-8 bg-transparent border-0 shadow-none backdrop-blur-0 lg:bg-white/95 lg:backdrop-blur-lg lg:border lg:border-white/30 lg:shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
          <div className="flex justify-center lg:hidden">
            <Image
              src="/logo/logo-white.png"
              alt="Escape Matrix"
              width={200}
              height={60}
              className="w-48 h-auto object-contain"
              priority
            />
          </div>
          <div className="space-y-2 hidden lg:block">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.35em]">Sign in</p>
            <h2 className="text-3xl font-semibold text-slate-900 leading-tight">Access your workspace</h2>
            <p className="text-base text-slate-500">
              Use your company email or continue with a social account.
            </p>
          </div>

          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0',
                formButtonPrimary: 'bg-slate-900 hover:bg-slate-800',
              },
            }}
            routing="hash"
          />

          <p className="hidden lg:block text-sm text-slate-500 text-center">
            By continuing you agree to our{' '}
            <a href="/privacy" className="font-medium text-slate-900 hover:underline">
              privacy policy
            </a>{' '}
            and{' '}
            <a href="/terms" className="font-medium text-slate-900 hover:underline">
              terms of use
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
