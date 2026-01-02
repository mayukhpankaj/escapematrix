'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, ListTodo, Target, Zap, Menu, X, CheckCircle2, Clock, CalendarDays } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import TaskFormModal from '@/components/TaskFormModal'
import TaskDetailModal from '@/components/TaskDetailModal'
import Image from 'next/image'
import useUserStore from '@/store/userStore'
import confetti from 'canvas-confetti'
import useProGuard from '@/hooks/use-pro-guard'

const API_BASE = '/backend-api/api'

export default function TaskPage() {
  const [tasks, setTasks] = useState({ 'TO-DO': [], 'IN-PROGRESS': [], 'COMPLETED': [] })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [draggedTask, setDraggedTask] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
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
      fetchTasks()
    }
  }, [isSignedIn, isLoaded, user, router, setUser])

  const fetchTasks = async () => {
    try {
      const token = await getToken()

      const tasksResponse = await fetch(`${API_BASE}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const deadlinesResponse = await fetch(`${API_BASE}/deadlines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (tasksResponse.ok && deadlinesResponse.ok) {
        const tasksData = await tasksResponse.json()
        const deadlinesData = await deadlinesResponse.json()

        const filteredTasks = {
          'TO-DO': [],
          'IN-PROGRESS': [],
          'COMPLETED': []
        }

        Object.keys(tasksData).forEach(status => {
          if (tasksData[status]) {
            const shortTermTasks = tasksData[status].filter(task => task.task_type === 'SHORT_TERM')

            if (status === 'PENDING') {
              filteredTasks['IN-PROGRESS'] = shortTermTasks
            } else if (status === 'IN-PROGRESS') {
              filteredTasks['IN-PROGRESS'] = [...filteredTasks['IN-PROGRESS'], ...shortTermTasks]
            } else {
              filteredTasks[status] = shortTermTasks
            }
          }
        })

        deadlinesData.forEach(deadline => {
          const deadlineTask = {
            ...deadline,
            isDeadline: true,
            task_type: 'DEADLINE'
          }

          if (deadline.status === 'PENDING') {
            filteredTasks['TO-DO'].push(deadlineTask)
          } else if (deadline.status === 'IN-PROGRESS' || deadline.status === 'OVERDUE') {
            filteredTasks['IN-PROGRESS'].push(deadlineTask)
          } else if (deadline.status === 'COMPLETED') {
            filteredTasks['COMPLETED'].push(deadlineTask)
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

  const handleCardClick = (task) => {
    setSelectedTask(task)
    setShowDetailModal(true)
  }

  const handleDeleteFromModal = async () => {
    if (!selectedTask) return

    try {
      const token = await getToken()

      const endpoint = selectedTask.isDeadline
        ? `${API_BASE}/deadlines/${selectedTask.id}`
        : `${API_BASE}/tasks/${selectedTask.id}`

      await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      setShowDetailModal(false)
      setSelectedTask(null)
      await fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleDragStart = (e, task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnStatus)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e, newStatus) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedTask) return

    const statusToColumn = {
      'PENDING': 'TO-DO',
      'IN-PROGRESS': 'IN-PROGRESS',
      'OVERDUE': 'IN-PROGRESS',
      'COMPLETED': 'COMPLETED',
      'TO-DO': 'TO-DO'
    }

    const oldStatus = statusToColumn[draggedTask.status] || draggedTask.status

    const dropTarget = e.target
    const dropRect = dropTarget.getBoundingClientRect()
    const dropY = e.clientY - dropRect.top

    const columnTasks = tasks[newStatus] || []
    let dropIndex = columnTasks.length

    const cardElements = dropTarget.querySelectorAll('[data-task-id]')
    for (let i = 0; i < cardElements.length; i++) {
      const cardRect = cardElements[i].getBoundingClientRect()
      const cardMiddle = cardRect.top + cardRect.height / 2 - dropRect.top

      if (dropY < cardMiddle) {
        dropIndex = i
        break
      }
    }

    const isSameColumn = oldStatus === newStatus

    if (isSameColumn) {
      const oldIndex = columnTasks.findIndex(t => t.id === draggedTask.id)

      if (oldIndex === dropIndex) {
        setDraggedTask(null)
        return
      }

      setTasks(prevTasks => {
        const newTasks = { ...prevTasks }
        const columnTasksCopy = [...newTasks[newStatus]]

        const [movedTask] = columnTasksCopy.splice(oldIndex, 1)

        const adjustedDropIndex = dropIndex > oldIndex ? dropIndex - 1 : dropIndex
        columnTasksCopy.splice(adjustedDropIndex, 0, movedTask)

        newTasks[newStatus] = columnTasksCopy
        return newTasks
      })

      setDraggedTask(null)

      try {
        const token = await getToken()
        const adjustedDropIndex = dropIndex > columnTasks.findIndex(t => t.id === draggedTask.id) ? dropIndex - 1 : dropIndex

        await fetch(`${API_BASE}/tasks/reorder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            task_id: draggedTask.id,
            new_status: newStatus,
            new_order: adjustedDropIndex,
            task_type: draggedTask.task_type
          }),
        })

        await fetchTasks()
      } catch (error) {
        console.error('Error reordering task:', error)
        await fetchTasks()
      }
    } else {
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks }

        newTasks[oldStatus] = newTasks[oldStatus].filter(t => t.id !== draggedTask.id)

        const updatedTask = { ...draggedTask, status: newStatus }
        const newColumnTasks = [...newTasks[newStatus]]
        newColumnTasks.splice(dropIndex, 0, updatedTask)
        newTasks[newStatus] = newColumnTasks

        return newTasks
      })

      if (newStatus === 'COMPLETED') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }

      setDraggedTask(null)

      try {
        const token = await getToken()

        if (draggedTask.isDeadline) {
          const statusMap = {
            'TO-DO': 'PENDING',
            'IN-PROGRESS': 'IN-PROGRESS',
            'COMPLETED': 'COMPLETED'
          }

          await fetch(`${API_BASE}/deadlines/${draggedTask.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status: statusMap[newStatus] }),
          })

          await fetchTasks()
        } else {
          const statusResponse = await fetch(`${API_BASE}/tasks/${draggedTask.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          })

          if (statusResponse.ok) {
            await fetch(`${API_BASE}/tasks/reorder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                task_id: draggedTask.id,
                new_status: newStatus,
                new_order: dropIndex,
                task_type: draggedTask.task_type
              }),
            })

            await fetchTasks()
          } else {
            console.error('Failed to update task status, rolling back...')
            await fetchTasks()
          }
        }
      } catch (error) {
        console.error('Error updating task:', error)
        await fetchTasks()
      }
    }
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  if (checking || !isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden bg-transparent px-4 py-3 flex items-center justify-start sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
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
                  className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
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

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
                <div
                  onDragOver={(e) => handleDragOver(e, 'TO-DO')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'TO-DO')}
                  className={`min-h-auto lg:min-h-[500px] rounded-lg p-4 transition-all ${
                    dragOverColumn === 'TO-DO' ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''
                  }`}
                >
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
                        <div
                          key={task.id}
                          data-task-id={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move transition-opacity ${
                            draggedTask?.id === task.id ? 'opacity-50' : 'opacity-100'
                          }`}
                        >
                          <TaskCard task={task} onUpdate={fetchTasks} onCardClick={handleCardClick} />
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center text-gray-500 border border-gray-200">
                        No tasks to do
                      </div>
                    )}
                  </div>
                </div>

                <div
                  onDragOver={(e) => handleDragOver(e, 'IN-PROGRESS')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'IN-PROGRESS')}
                  className={`min-h-auto lg:min-h-[500px] rounded-lg p-4 transition-all ${
                    dragOverColumn === 'IN-PROGRESS' ? 'bg-orange-50 ring-2 ring-orange-400 ring-inset' : ''
                  }`}
                >
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
                        <div
                          key={task.id}
                          data-task-id={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move transition-opacity ${
                            draggedTask?.id === task.id ? 'opacity-50' : 'opacity-100'
                          }`}
                        >
                          <TaskCard task={task} onUpdate={fetchTasks} onCardClick={handleCardClick} />
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 text-center text-gray-500 border border-gray-200">
                        No tasks in progress
                      </div>
                    )}
                  </div>
                </div>

                <div
                  onDragOver={(e) => handleDragOver(e, 'COMPLETED')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'COMPLETED')}
                  className={`min-h-auto lg:min-h-[500px] rounded-lg p-4 transition-all ${
                    dragOverColumn === 'COMPLETED' ? 'bg-green-50 ring-2 ring-green-400 ring-inset' : ''
                  }`}
                >
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
                        <div
                          key={task.id}
                          data-task-id={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move transition-opacity ${
                            draggedTask?.id === task.id ? 'opacity-50' : 'opacity-100'
                          }`}
                        >
                          <TaskCard task={task} onUpdate={fetchTasks} onCardClick={handleCardClick} />
                        </div>
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

      {showTaskModal && (
        <TaskFormModal
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedTask(null)
        }}
        onUpdate={fetchTasks}
        onDelete={handleDeleteFromModal}
      />
    </div>
  )
}
