'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Menu, X, ListTodo, Target, Phone, Loader2, CalendarDays, Zap, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import useUserStore from '@/store/userStore'

const API_BASE = '/backend-api/api'

export default function CallMePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUser, fullName } = useUserStore()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    } else if (isSignedIn && user) {
      setUser({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        username: user.username,
      })
    }
  }, [isSignedIn, isLoaded, user, router, setUser])

  const handleMakeCall = async () => {
    setLoading(true)
    setMessage('')

    try {
      const token = await getToken()
      
      // Get user's full name, fallback to firstName or email
      const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User'
      
      const response = await fetch(`${API_BASE}/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_name: userName }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Call initiated successfully! Call ID: ${data.call_id || 'N/A'}`)
      } else {
        setMessage(`❌ Error: ${data.detail || 'Failed to make call'}`)
      }
    } catch (error) {
      console.error('Error making call:', error)
      setMessage('❌ Error: Failed to initiate call. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-transparent px-4 py-3 flex items-center justify-start sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 h-screen bg-white shadow-xl z-40 border-r border-gray-200
            w-80 transition-transform duration-300 ease-in-out flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Top Section */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pt-20 lg:pt-6">
              {/* Logo */}
              <div className="mb-8">
                <Image 
                  src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/t95qed68_fontbolt%20%283%29.png"
                  alt="Escape Matrix"
                  width={280}
                  height={67}
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => router.push('/habits')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
                >
                  <Zap className="w-5 h-5" />
                  Streaks
                </button>
                <button
                  onClick={() => router.push('/progress')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
                >
                  <TrendingUp className="w-5 h-5" />
                  Progress
                </button>
                <button
                  onClick={() => router.push('/task')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
                >
                  <ListTodo className="w-5 h-5" />
                  Task
                </button>
                <button
                  onClick={() => router.push('/deadlines')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
                >
                  <Target className="w-5 h-5" />
                  Deadlines
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <button 
                onClick={() => {
                  // Try to find and click the actual UserButton
                  const userButtonElements = document.querySelectorAll('button');
                  for (const btn of userButtonElements) {
                    // Check if this button is the Clerk UserButton
                    if (btn.querySelector('img') || btn.getAttribute('data-clerk-user-button') || 
                        btn.className.includes('clerk') || btn.getAttribute('aria-label')?.includes('user')) {
                      btn.click();
                      return;
                    }
                  }
                  // If no UserButton found, try to trigger the menu directly
                  const clerkElements = document.querySelectorAll('[class*="clerk"]');
                  for (const elem of clerkElements) {
                    if (elem.tagName === 'BUTTON' || elem.querySelector('button')) {
                      const button = elem.tagName === 'BUTTON' ? elem : elem.querySelector('button');
                      button.click();
                      return;
                    }
                  }
                }}
                className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                {fullName || 'Profile'}
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-black">Call Me</h2>
              <p className="text-gray-500 mt-1">Get a phone call about your pending tasks</p>
            </div>

            {/* Call Card */}
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="mb-6">
                <div className="bg-black rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center">
                  <Phone className="w-12 h-12 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-black mb-2">
                Ready for your task reminder?
              </h3>
              <p className="text-gray-600 mb-8">
                Click the button below to receive a phone call about your pending and in-progress tasks.
              </p>

              <Button
                onClick={handleMakeCall}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-8 py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Initiating Call...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    Call Me
                  </>
                )}
              </Button>

              {/* Message Display */}
              {message && (
                <div className={`mt-6 p-4 rounded-lg ${
                  message.startsWith('✅') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <p className="text-sm">{message}</p>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• We'll call you on your registered phone number</li>
                <li>• The AI will summarize your pending and in-progress tasks</li>
                <li>• You can ask questions about your tasks</li>
                <li>• The call typically lasts 2-5 minutes</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
