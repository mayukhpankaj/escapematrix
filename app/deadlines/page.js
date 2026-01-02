'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TrendingUp, ListTodo, Target, Zap, Menu, X, Clock, CheckCircle2, AlertCircle, Plus, CalendarDays, Trash2 } from 'lucide-react'
import Image from 'next/image'
import useUserStore from '@/store/userStore'
import useProGuard from '@/hooks/use-pro-guard'

const API_BASE = '/backend-api/api'

const PRIORITY_COLORS = {
  'LOW': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'MEDIUM': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  'HIGH': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'URGENT': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
}

const STATUS_COLORS = {
  'PENDING': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  'IN-PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  'COMPLETED': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  'OVERDUE': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
}

const pad2 = (n) => String(n).padStart(2, '0')

const getCountdown = (deadlineTime, now) => {
  const deadline = new Date(deadlineTime)
  const diffMs = deadline - now

  if (diffMs <= 0) {
    return { isOverdue: true, days: '00', hours: '00', minutes: '00', seconds: '00' }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return {
    isOverdue: false,
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  }
}

function FlipDigit({ digit, label }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('flip-animate')
    void el.offsetWidth
    el.classList.add('flip-animate')
  }, [digit])

  return (
    <div className="flex flex-col items-center mx-0.5 sm:mx-1">
      <div className="flex">
        <span className="flip-digit w-6 h-8 sm:w-8 sm:h-12 rounded-tl rounded-bl bg-black text-white font-mono text-sm sm:text-lg md:text-xl font-bold flex items-center justify-center">
          <span ref={ref} className="flip-digit-inner flip-animate">
            {digit[0]}
          </span>
        </span>
        <span className="flip-digit w-6 h-8 sm:w-8 sm:h-12 rounded-tr rounded-br bg-black text-white font-mono text-sm sm:text-lg md:text-xl font-bold flex items-center justify-center ml-px">
          <span ref={useRef(null)} className="flip-digit-inner">
            {digit[1]}
          </span>
        </span>
      </div>
      {label && (
        <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
          {label}
        </div>
      )}
    </div>
  )
}

function FlipCountdown({ deadlineTime, now }) {
  const countdown = getCountdown(deadlineTime, now)
  if (countdown.isOverdue) return <span>Overdue</span>

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <FlipDigit digit={countdown.days} label="DAYS" />
      <span className="text-xl sm:text-2xl text-gray-400 -mb-3 sm:-mb-4">:</span>
      <FlipDigit digit={countdown.hours} label="HOURS" />
      <span className="text-xl sm:text-2xl text-gray-400 -mb-3 sm:-mb-4">:</span>
      <FlipDigit digit={countdown.minutes} label="MIN" />
      <span className="text-xl sm:text-2xl text-gray-400 -mb-3 sm:-mb-4">:</span>
      <FlipDigit digit={countdown.seconds} label="SEC" />
    </div>
  )
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  
  // Form state
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUser, fullName } = useUserStore()
  const { checking } = useProGuard()

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

  useEffect(() => {
    if (isSignedIn) {
      fetchDeadlines()
    }
  }, [isSignedIn])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchDeadlines = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/deadlines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDeadlines(data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching deadlines:', error)
      setLoading(false)
    }
  }

  const createDeadline = async () => {
    if (!taskName.trim() || !deadlineDate || !deadlineTime) return

    try {
      const token = await getToken()
      const deadlineDateTime = `${deadlineDate}T${deadlineTime}:00Z`
      
      const response = await fetch(`${API_BASE}/deadlines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          task_name: taskName,
          task_description: taskDescription,
          deadline_time: deadlineDateTime,
          priority: priority
        })
      })

      if (response.ok) {
        setTaskName('')
        setTaskDescription('')
        setDeadlineDate('')
        setDeadlineTime('')
        setPriority('MEDIUM')
        setShowAddModal(false)
        await fetchDeadlines()
      }
    } catch (error) {
      console.error('Error creating deadline:', error)
    }
  }

  const deleteDeadline = async (deadlineId) => {
    if (!confirm('Are you sure you want to delete this deadline?')) return

    try {
      const token = await getToken()
      await fetch(`${API_BASE}/deadlines/${deadlineId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await fetchDeadlines()
    } catch (error) {
      console.error('Error deleting deadline:', error)
    }
  }

  const updateStatus = async (deadlineId, newStatus) => {
    try {
      const token = await getToken()
      await fetch(`${API_BASE}/deadlines/${deadlineId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      await fetchDeadlines()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = (deadlineTime) => getCountdown(deadlineTime, now)

  if (checking || !isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 h-screen bg-white shadow-xl z-50 border-r border-gray-200
          w-80 transition-transform duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pt-20 lg:pt-6">
            <div className="mb-8">
              <Image 
                src="https://customer-assets.emergentagent.com/job_matrix-escape-11/artifacts/t95qed68_fontbolt%20%283%29.png"
                alt="Escape Matrix"
                width={280}
                height={67}
                className="w-full h-auto object-contain"
              />
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => router.push('/habits')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
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
                className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
              >
                <Target className="w-5 h-5" />
                Deadlines
              </button>
            </nav>
          </div>
        </div>

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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-4 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">countdown</h2>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Deadline
            </Button>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            </div>
          ) : deadlines.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No deadlines yet</h3>
              <p className="text-gray-500 mb-4">Create your first deadline to start tracking!</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create First Deadline
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {deadlines.map((deadline) => {
                const StatusIcon = STATUS_COLORS[deadline.status].icon
                const timeRemaining = getTimeRemaining(deadline.deadline_time)
                
                return (
                  <div key={deadline.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className="w-5 h-5" />
                          <h3 className="text-lg font-semibold text-gray-900">{deadline.task_name}</h3>
                        </div>
                        {deadline.task_description && (
                          <p className="text-gray-600 text-sm mb-3">{deadline.task_description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" />
                            {formatDate(deadline.deadline_time)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => {
                              const dropdown = document.getElementById(`status-dropdown-${deadline.id}`)
                              dropdown.classList.toggle('hidden')
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 hover:shadow-md ${STATUS_COLORS[deadline.status].bg} ${STATUS_COLORS[deadline.status].text} border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black flex items-center gap-1`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {deadline.status.replace('-', ' ')}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div
                            id={`status-dropdown-${deadline.id}`}
                            className="hidden absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                updateStatus(deadline.id, 'PENDING')
                                document.getElementById(`status-dropdown-${deadline.id}`).classList.add('hidden')
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Clock className="w-3 h-3 text-gray-500" />
                              Pending
                            </button>
                            <button
                              onClick={() => {
                                updateStatus(deadline.id, 'IN-PROGRESS')
                                document.getElementById(`status-dropdown-${deadline.id}`).classList.add('hidden')
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Clock className="w-3 h-3 text-blue-500" />
                              In Progress
                            </button>
                            <button
                              onClick={() => {
                                updateStatus(deadline.id, 'COMPLETED')
                                document.getElementById(`status-dropdown-${deadline.id}`).classList.add('hidden')
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Completed
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDeadline(deadline.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={`text-center py-3 px-4 rounded-lg ${timeRemaining.isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                      {timeRemaining.isOverdue ? (
                        <div className="text-red-600 font-semibold">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                          Overdue
                        </div>
                      ) : (
                        <FlipCountdown deadlineTime={deadline.deadline_time} now={now} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">New Deadline</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <Input
                  type="text"
                  placeholder="Enter task name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <Textarea
                  placeholder="Enter task description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Date</label>
                <Input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Time</label>
                <Input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button onClick={createDeadline} className="flex-1 bg-black hover:bg-gray-800 text-white">
                Create Deadline
              </Button>
              <Button onClick={() => {
                setShowAddModal(false)
                setTaskName('')
                setTaskDescription('')
                setDeadlineDate('')
                setDeadlineTime('')
                setPriority('MEDIUM')
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
