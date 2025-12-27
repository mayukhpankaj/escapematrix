'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Plus, Menu, X, CheckCircle2, Clock, ListTodo, Target } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import TaskFormModal from '@/components/TaskFormModal'
import Image from 'next/image'

const API_BASE = '/backend-api/api'

export default function DashboardPage() {
  const [tasks, setTasks] = useState({ 'TO-DO': [], 'IN-PROGRESS': [], 'COMPLETED': [] })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    } else if (isSignedIn) {
      fetchTasks()
    }
  }, [isSignedIn, isLoaded, router])

  const fetchTasks = async () => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // Filter to only show SHORT_TERM tasks
        const filteredTasks = {
          'TO-DO': [],
          'IN-PROGRESS': [],
          'COMPLETED': []
        }
        
        // Process all tasks and filter SHORT_TERM only
        Object.keys(data).forEach(status => {
          if (data[status]) {
            const shortTermTasks = data[status].filter(task => task.task_type === 'SHORT_TERM')
            
            // Map PENDING to IN-PROGRESS
            if (status === 'PENDING') {
              filteredTasks['IN-PROGRESS'] = shortTermTasks
            } else if (status === 'IN-PROGRESS') {
              filteredTasks['IN-PROGRESS'] = [...filteredTasks['IN-PROGRESS'], ...shortTermTasks]
            } else {
              filteredTasks[status] = shortTermTasks
            }
          }
        })
        
        setTasks(filteredTasks)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskCreated = () => {
    setShowTaskModal(false)
    fetchTasks()
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
                  onClick={() => router.push('/dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
                >
                  <ListTodo className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/long-term')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
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
              <span className="text-sm text-gray-600">Profile</span>
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
                <h2 className="text-3xl font-bold text-black">My Tasks</h2>
                <p className="text-gray-500 mt-1">Track your daily habits and goals</p>
              </div>
              <Button
                onClick={() => setShowTaskModal(true)}
                className="bg-black hover:bg-gray-800 text-white rounded-full px-6 py-6 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Task
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-500">Loading tasks...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* TO-DO Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ListTodo className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-black">To-Do</h3>
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {tasks['TO-DO']?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks['TO-DO']?.length > 0 ? (
                      tasks['TO-DO'].map((task) => (
                        <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center text-gray-500 border border-gray-200">
                        No tasks to do
                      </div>
                    )}
                  </div>
                </div>

                {/* IN-PROGRESS Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-black">In-Progress</h3>
                    <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {tasks['IN-PROGRESS']?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks['IN-PROGRESS']?.length > 0 ? (
                      tasks['IN-PROGRESS'].map((task) => (
                        <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center text-gray-500 border border-gray-200">
                        No tasks in progress
                      </div>
                    )}
                  </div>
                </div>

                {/* COMPLETED Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-black">Completed</h3>
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {tasks['COMPLETED']?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks['COMPLETED']?.length > 0 ? (
                      tasks['COMPLETED'].map((task) => (
                        <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center text-gray-500 border border-gray-200">
                        No completed tasks
                      </div>
                    )}
                  </div>
                </div>
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
