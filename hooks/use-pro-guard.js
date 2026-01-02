'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function useProGuard() {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [state, setState] = useState({ checking: true, isPro: false })

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setState({ checking: false, isPro: false })
      router.replace('/')
      return
    }

    let active = true

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const verify = async () => {
      try {
        const proPending =
          typeof window !== 'undefined' &&
          sessionStorage.getItem('pro_pending') === 'true'

        const maxErrorAttempts = 3
        const maxFalseAttempts = proPending ? 12 : 1

        let errorAttempts = 0
        let falseAttempts = 0

        while (active) {
          const response = await fetch(`/api/pro-status?t=${Date.now()}`, {
            cache: 'no-store',
          })

          if (!active) return

          if (response.status === 401) {
            setState({ checking: false, isPro: false })
            router.replace('/')
            return
          }

          if (!response.ok) {
            errorAttempts += 1
            if (errorAttempts >= maxErrorAttempts) {
              throw new Error('Failed to verify pro status')
            }
            await sleep(250 * errorAttempts)
            continue
          }

          const { isPro } = await response.json()

          if (!active) return

          if (isPro) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pro_pending')
            }
            setState({ checking: false, isPro: true })
            return
          }

          falseAttempts += 1
          if (falseAttempts >= maxFalseAttempts) {
            setState({ checking: false, isPro: false })
            router.replace('/onboarding')
            return
          }

          await sleep(750)
        }
      } catch (error) {
        console.error('Pro guard check failed:', error)
        if (active) {
          setState({ checking: false, isPro: false })
          router.replace('/onboarding')
        }
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, router])

  return { ...state }
}
