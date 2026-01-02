'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { TrendingUp, ListTodo, Target, Zap, Menu, X, CalendarDays } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import TaskFormModal from '@/components/TaskFormModal'
import Image from 'next/image'
import useUserStore from '@/store/userStore'

const API_BASE = '/api'

export default function LongTermPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUser, fullName } = useUserStore()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    } else if (isSignedIn && user) {
      // Store user data in global state
      setUser({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        username: user.username,
      })
      fetchLongTermTasks()
    }
  }, [isSignedIn, isLoaded, user, router, setUser])

  const fetchLongTermTasks = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/tasks/long-term`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching long-term tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskCreated = () => {
    setShowTaskModal(false)
    fetchLongTermTasks()
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Minimal with just burger */}
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
          {/* Top Section - Logo and Navigation */}
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
                  <CalendarDays className="w-5 h-5" />
                  Daily Habit Tracker
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
                  onClick={() => router.push('/long-term')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
                >
                  <Target className="w-5 h-5" />
                  Long Term Goals
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Section - User Profile */}
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-black">Long Term Goals</h2>
                <p className="text-gray-500 mt-1">Big picture goals that shape your future</p>
              </div>
              <Button
                onClick={() => setShowTaskModal(true)}
                className="bg-black hover:bg-gray-800 text-white rounded-full px-6 py-6 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Goal
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-500">Loading goals...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={fetchLongTermTasks} />
                  ))
                ) : (
                  <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-200">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-black mb-2">No Long Term Goals Yet</h3>
                    <p className="text-gray-500 mb-6">Start planning your future by creating your first long-term goal.</p>
                    <Button
                      onClick={() => setShowTaskModal(true)}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Task Form Modal */}
      {showTaskModal && (
        <TaskFormModal
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  )
}
