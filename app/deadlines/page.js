'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Menu, X, ListTodo, Target, Sparkles, Plus, Trash2, Phone, CalendarDays, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import useUserStore from '@/store/userStore'

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

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Form state
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUser } = useUserStore()

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

  // Gantt Chart Helper Functions
  const getGanttData = () => {
    if (deadlines.length === 0) return { minDate: new Date(), maxDate: new Date(), days: [] }
    
    const now = new Date()
    const dates = deadlines.map(d => {
      const startDate = new Date(d.start_time)
      const deadlineDate = new Date(d.deadline_time)
      return [startDate, deadlineDate]
    }).flat()
    
    dates.push(now)
    
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    
    // Add padding
    minDate.setDate(minDate.getDate() - 1)
    maxDate.setDate(maxDate.getDate() + 1)
    
    // Generate days array
    const days = []
    let currentDate = new Date(minDate)
    while (currentDate <= maxDate) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return { minDate, maxDate, days }
  }

  const calculateBarPosition = (startTime, deadlineTime, minDate, maxDate) => {
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)
    const startDate = new Date(startTime)
    const endDate = new Date(deadlineTime)
    
    const startOffset = (startDate - minDate) / (1000 * 60 * 60 * 24)
    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24)
    
    const left = (startOffset / totalDays) * 100
    const width = (duration / totalDays) * 100
    
    return { left: `${left}%`, width: `${Math.max(width, 1)}%` }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = (deadlineTime) => {
    const now = new Date()
    const deadline = new Date(deadlineTime)
    const diff = deadline - now
    
    if (diff <= 0) {
      return { text: 'Overdue', isOverdue: true }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) {
      return { text: `${days}d ${hours}h ${minutes}m`, isOverdue: false }
    } else if (hours > 0) {
      return { text: `${hours}h ${minutes}m`, isOverdue: false }
    } else {
      return { text: `${minutes}m`, isOverdue: false }
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const { minDate, maxDate, days } = getGanttData()
  const now = new Date()

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 h-screen bg-white shadow-xl z-40 border-r border-gray-200
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
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
              >
                <ListTodo className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => router.push('/deadlines')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
              >
                <Target className="w-5 h-5" />
                Deadlines
              </button>
              <button
                onClick={() => router.push('/habits')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
              >
                <CalendarDays className="w-5 h-5" />
                Daily Habit Tracker
              </button>
              <button
                onClick={() => router.push('/ai')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
              >
                <Sparkles className="w-5 h-5" />
                AI
              </button>
              <button
                onClick={() => router.push('/call-me')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
              >
                <Phone className="w-5 h-5" />
                Call Me
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm text-gray-600">Profile</span>
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
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Deadlines</h2>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Deadline
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
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
            <>
              {/* Gantt Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Timeline View</h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[1200px]">
                    {/* Timeline Header */}
                    <div className="flex mb-2 pb-2 border-b">
                      <div className="w-64 flex-shrink-0"></div>
                      <div className="flex-1 flex">
                        {days.map((day, index) => (
                          <div 
                            key={index} 
                            className="flex-1 text-center text-xs text-gray-600 px-1 border-l border-gray-200"
                          >
                            <div className="font-medium">{day.getDate()}</div>
                            <div className="text-gray-400">{day.toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="text-gray-400 text-[10px]">00:00</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Rows */}
                    {deadlines.map((deadline) => {
                      const StatusIcon = STATUS_COLORS[deadline.status].icon
                      const position = calculateBarPosition(deadline.start_time, deadline.deadline_time, minDate, maxDate)
                      const timeRemaining = getTimeRemaining(deadline.deadline_time)
                      
                      return (
                        <div key={deadline.id} className="flex items-center mb-4 hover:bg-gray-50 py-3 rounded-lg px-2 group">
                          <div className="w-64 flex-shrink-0 pr-4">
                            <div className="font-bold text-base text-gray-900 mb-1">{deadline.task_name}</div>
                            <div className={`text-sm mb-2 ${timeRemaining.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              {timeRemaining.isOverdue ? '⚠️ ' : '⏱️ '}
                              {timeRemaining.text} remaining
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${PRIORITY_COLORS[deadline.priority].bg} ${PRIORITY_COLORS[deadline.priority].text}`}>
                                {deadline.priority}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-medium ${STATUS_COLORS[deadline.status].bg} ${STATUS_COLORS[deadline.status].text}`}>
                                <StatusIcon className="w-3 h-3" />
                                {deadline.status}
                              </span>
                              <button
                                onClick={() => deleteDeadline(deadline.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete deadline"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 relative h-10">
                            {/* Hour markers */}
                            <div className="absolute inset-0 flex">
                              {days.map((_, index) => (
                                <div key={index} className="flex-1 border-l border-gray-100">
                                  <div className="h-full flex">
                                    {[0, 6, 12, 18].map((hour) => (
                                      <div key={hour} className="flex-1 border-l border-gray-50" />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Today marker */}
                            {now >= minDate && now <= maxDate && (
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                                style={{ 
                                  left: `${((now - minDate) / (maxDate - minDate)) * 100}%` 
                                }}
                              >
                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                  <div className="bg-red-500 text-white text-[10px] px-1 rounded whitespace-nowrap">Now</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Gantt Bar */}
                            <div
                              className={`absolute top-1 h-8 rounded-lg cursor-pointer transition-all hover:shadow-lg z-10 flex items-center justify-center text-white text-xs font-semibold ${
                                deadline.status === 'COMPLETED' ? 'bg-green-500' :
                                deadline.status === 'OVERDUE' ? 'bg-red-500' :
                                deadline.status === 'IN-PROGRESS' ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={position}
                              title={`${deadline.task_name}\nStart: ${formatDate(deadline.start_time)}\nDeadline: ${formatDate(deadline.deadline_time)}\nRemaining: ${timeRemaining.text}`}
                            >
                              <span className="px-2 truncate">{deadline.task_name}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
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
