'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Menu, X, ListTodo, Target, Sparkles, Plus, Trash2, Phone, CalendarDays } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import useUserStore from '@/store/userStore'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const API_BASE = '/backend-api/api'

// Color palette for habits
const HABIT_COLORS = [
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Orange', value: '#fed7aa' },
]

export default function HabitsPage() {
  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newHabitName, setNewHabitName] = useState('')
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const currentDayRef = useRef(null)
  const scrollContainerRef = useRef(null)
  
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

  // Fetch habits and completions
  useEffect(() => {
    if (isSignedIn) {
      fetchData()
    }
  }, [isSignedIn, currentMonth])

  // Auto-scroll to current day after data loads
  useEffect(() => {
    if (!loading && currentDayRef.current && scrollContainerRef.current) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        currentDayRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }, 100)
    }
  }, [loading, habits])

  const fetchData = async () => {
    try {
      const token = await getToken()
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1

      // Fetch habits
      const habitsRes = await fetch(`${API_BASE}/habits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const habitsData = await habitsRes.json()
      setHabits(habitsData)

      // Fetch completions for current month
      const completionsRes = await fetch(`${API_BASE}/habits/completions/${year}/${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const completionsData = await completionsRes.json()
      setCompletions(completionsData)
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const addHabit = async () => {
    if (!newHabitName.trim()) return

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          habit_name: newHabitName,
          color: HABIT_COLORS[habits.length % HABIT_COLORS.length].value
        })
      })

      if (response.ok) {
        setNewHabitName('')
        setShowAddHabit(false)
        await fetchData()
      }
    } catch (error) {
      console.error('Error adding habit:', error)
    }
  }

  const deleteHabit = async (habitId) => {
    if (!confirm('Are you sure you want to delete this habit?')) return

    try {
      const token = await getToken()
      await fetch(`${API_BASE}/habits/${habitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      await fetchData()
    } catch (error) {
      console.error('Error deleting habit:', error)
    }
  }

  const toggleCompletion = async (habitId, date) => {
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/habits/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          habit_id: habitId,
          date: date
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update completions state
        if (result.completed) {
          setCompletions([...completions, {
            habit_id: habitId,
            completion_date: date
          }])
        } else {
          setCompletions(completions.filter(c => 
            !(c.habit_id === habitId && c.completion_date === date)
          ))
        }
      }
    } catch (error) {
      console.error('Error toggling completion:', error)
    }
  }

  // Calculate days in current month
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  // Calculate completion score for each day
  const getCompletionScores = () => {
    const daysInMonth = getDaysInMonth()
    const scores = []
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayCompletions = completions.filter(c => c.completion_date === dateStr)
      const score = habits.length > 0 ? (dayCompletions.length / habits.length) * 100 : 0
      scores.push(score)
    }

    return scores
  }

  // Check if a habit is completed on a specific day
  const isCompleted = (habitId, day) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return completions.some(c => c.habit_id === habitId && c.completion_date === dateStr)
  }

  // Get current day
  const getCurrentDay = () => {
    const now = new Date()
    if (now.getFullYear() === currentMonth.getFullYear() && 
        now.getMonth() === currentMonth.getMonth()) {
      return now.getDate()
    }
    return -1
  }

  // Chart data
  const chartData = {
    labels: Array.from({ length: getDaysInMonth() }, (_, i) => i + 1),
    datasets: [
      {
        label: 'Completion %',
        data: getCompletionScores(),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Daily Progress',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%'
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const currentDay = getCurrentDay()
  const daysInMonth = getDaysInMonth()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Escape Matrix
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <ListTodo className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          <button
            onClick={() => router.push('/long-term')}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Target className="w-5 h-5 mr-3" />
            Long Term Goals
          </button>
          <button
            onClick={() => router.push('/habits')}
            className="flex items-center w-full px-4 py-3 text-white bg-purple-600 rounded-lg"
          >
            <CalendarDays className="w-5 h-5 mr-3" />
            Daily Habit Tracker
          </button>
          <button
            onClick={() => router.push('/ai')}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Sparkles className="w-5 h-5 mr-3" />
            AI
          </button>
          <button
            onClick={() => router.push('/call-me')}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Phone className="w-5 h-5 mr-3" />
            Call Me
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Daily Habit Tracker</h2>
                <p className="text-sm text-gray-500">{monthName}</p>
              </div>
            </div>
            <Button onClick={() => setShowAddHabit(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Habit
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Progress Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Habits Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : habits.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <CalendarDays className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No habits yet</h3>
              <p className="text-gray-500 mb-4">Start tracking your daily habits by adding your first one!</p>
              <Button onClick={() => setShowAddHabit(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Habit
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto custom-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#a855f7 #f3f4f6'
                }}
              >
                <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    height: 12px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f3f4f6;
                    border-radius: 10px;
                    margin: 0 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to right, #a855f7, #7c3aed);
                    border-radius: 10px;
                    border: 2px solid #f3f4f6;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to right, #9333ea, #6d28d9);
                  }
                `}</style>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Habit
                      </th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <th 
                          key={day} 
                          ref={day === currentDay ? currentDayRef : null}
                          className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider ${day === currentDay ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
                        >
                          {day}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {habits.map((habit, index) => (
                      <tr key={habit.id} style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 sticky left-0 z-10" style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
                          {habit.habit_name}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                          const completed = isCompleted(habit.id, day)
                          const year = currentMonth.getFullYear()
                          const month = currentMonth.getMonth() + 1
                          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          
                          return (
                            <td key={day} className={`px-3 py-4 text-center ${day === currentDay ? 'bg-purple-50' : ''}`}>
                              <button
                                onClick={() => toggleCompletion(habit.id, dateStr)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  completed 
                                    ? 'bg-purple-600 border-purple-600' 
                                    : day === currentDay
                                    ? 'border-purple-400 hover:border-purple-600'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {completed && (
                                  <svg className="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-center sticky right-0" style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Habit Modal */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Habit</h3>
            <Input
              type="text"
              placeholder="Habit name (e.g., Do Gym, Read, Meditate)"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addHabit()}
              className="mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <Button onClick={addHabit} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Add Habit
              </Button>
              <Button onClick={() => {
                setShowAddHabit(false)
                setNewHabitName('')
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
