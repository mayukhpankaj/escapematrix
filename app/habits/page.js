'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress, TrendingUp, ListTodo, Target, Sparkles, Plus, Trash2, Phone, CalendarDays, Smile, Zap, Menu } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Line } from 'react-chartjs-2'
import confetti from 'canvas-confetti'
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
import { preloadHomeData } from '@/utils/dataPreloader'
import AvatarGuide from '@/components/AvatarGuide'
import avatarManager from '@/utils/avatarManager'
import useProGuard from '@/hooks/use-pro-guard'

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

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
  const [selectedEmoji, setSelectedEmoji] = useState('✨')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [showPastData, setShowPastData] = useState(false)
  const [pastMonths, setPastMonths] = useState([])
  const [loadingPastData, setLoadingPastData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [completionAvatar, setCompletionAvatar] = useState(null)
  const currentDayRef = useRef(null)
  const scrollContainerRef = useRef(null)
  
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

  // Preload home data in background after habits data loads
  useEffect(() => {
    if (!loading && isSignedIn) {
      // Delay a bit to ensure habits page is fully loaded first
      const timer = setTimeout(() => {
        preloadHomeData(getToken).catch(console.error)
      }, 2000) // 2 second delay

      return () => clearTimeout(timer)
    }
  }, [loading, isSignedIn, getToken])

  // Test avatar manager
  useEffect(() => {
    console.log('Testing avatar manager:', {
      pageMessages: avatarManager.getPageMessages('habits'),
      pageAvatar: avatarManager.getPageAvatar('habits'),
      pageAvatarName: avatarManager.getPageAvatarName('habits'),
      settings: avatarManager.getSettings()
    })
  }, [loading])

  // Handle avatar completion events
  useEffect(() => {
    const handleCompletion = (eventData) => {
      console.log('Avatar completion event triggered:', eventData)
      setCompletionAvatar({
        messages: [eventData.message],
        avatarImage: eventData.avatarImage,
        avatarName: eventData.avatarName,
        autoHideDelay: eventData.autoHideDelay,
        typewriterSpeed: eventData.typewriterSpeed
      })

      // Hide completion avatar after delay
      setTimeout(() => {
        setCompletionAvatar(null)
      }, eventData.autoHideDelay + 2000)
    }

    avatarManager.onCompletion(handleCompletion)

    return () => {
      avatarManager.offCompletion(handleCompletion)
    }
  }, [])

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
      const habitWithEmoji = `${selectedEmoji} ${newHabitName}`
      
      const response = await fetch(`${API_BASE}/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          habit_name: habitWithEmoji,
          color: HABIT_COLORS[habits.length % HABIT_COLORS.length].value
        })
      })

      if (response.ok) {
        setNewHabitName('')
        setSelectedEmoji('✨')
        setShowEmojiPicker(false)
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

  const toggleCompletion = async (habitId, date, wasCompleted) => {
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

        if (!wasCompleted && result.completed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
          
          // Trigger avatar celebration
          const habit = habits.find(h => h.id === habitId)
          if (habit) {
            avatarManager.triggerHabitCompletion(habit.habit_name)
          }
        }
        
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

  // Fetch available past months
  const fetchPastMonths = async () => {
    setLoadingPastData(true)
    try {
      const token = await getToken()
      
      // Get all completions to find which months have data
      const response = await fetch(`${API_BASE}/habits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        setLoadingPastData(false)
        return
      }
      
      const allHabits = await response.json()
      
      // Get current date
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonthNum = now.getMonth()
      
      // Generate list of past months (last 12 months, excluding current)
      const pastMonthsList = []
      for (let i = 1; i <= 12; i++) {
        const date = new Date(currentYear, currentMonthNum - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        
        // Fetch data for this month
        const completionsRes = await fetch(
          `${API_BASE}/habits/completions/${year}/${month}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        
        if (completionsRes.ok) {
          const completionsData = await completionsRes.json()
          
          // Only add if there's data
          if (completionsData.length > 0) {
            pastMonthsList.push({
              date: date,
              year: year,
              month: month,
              monthName: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
              habits: allHabits,
              completions: completionsData
            })
          }
        }
      }
      
      setPastMonths(pastMonthsList)
      setLoadingPastData(false)
    } catch (error) {
      console.error('Error fetching past months:', error)
      setLoadingPastData(false)
    }
  }

  // Calculate days in current month

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
        label: 'Completion',
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
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.parsed.y
          }
        }
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
    layout: {
      padding: {
        top: 20,
        bottom: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 110, // Slightly more than 100 to add padding
        display: false,
        ticks: {
          display: false
        },
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  if (checking || !isLoaded || !isSignedIn) {
    return null
  }

  const currentDay = getCurrentDay()
  const daysInMonth = getDaysInMonth()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-4 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{monthName}</h2>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-2 sm:gap-3">
              <Button 
                onClick={() => {
                  setShowPastData(true)
                  fetchPastMonths()
                }} 
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Past Data
              </Button>
              <Button onClick={() => setShowAddHabit(true)} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Habit
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Progress Chart */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="h-48 sm:h-64 -mt-4 pt-4">
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
              <Button onClick={() => setShowAddHabit(true)} className="bg-black hover:bg-gray-800 text-white">
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
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Habit
                      </th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <th 
                          key={day} 
                          ref={day === currentDay ? currentDayRef : null}
                          className={`px-2 sm:px-3 py-3 text-center text-xs font-medium uppercase tracking-wider ${day === currentDay ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
                        >
                          {day}
                        </th>
                      ))}
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {habits.map((habit, index) => (
                      <tr key={habit.id} style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-800 sticky left-0 z-10" style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
                          {habit.habit_name}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                          const completed = isCompleted(habit.id, day)
                          const year = currentMonth.getFullYear()
                          const month = currentMonth.getMonth() + 1
                          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          
                          return (
                            <td key={day} className={`px-2 sm:px-3 py-4 text-center ${day === currentDay ? 'bg-purple-50' : ''}`}>
                              <button
                                onClick={() => toggleCompletion(habit.id, dateStr, completed)}
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
                        <td className="px-3 sm:px-6 py-4 text-center sticky right-0" style={{ backgroundColor: habit.color || HABIT_COLORS[index % HABIT_COLORS.length].value }}>
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
            
            {/* Emoji Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Emoji</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{selectedEmoji}</span>
                    <span className="text-gray-600">Click to change emoji</span>
                  </span>
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl rounded-lg overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setSelectedEmoji(emojiData.emoji)
                        setShowEmojiPicker(false)
                      }}
                      width={350}
                      height={400}
                      searchDisabled={false}
                      skinTonesDisabled={true}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Habit Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Habit Name</label>
              <Input
                type="text"
                placeholder="e.g., Do Gym, Read, Meditate"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                autoFocus
              />
            </div>

            {/* Preview */}
            {newHabitName && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                <p className="text-lg font-medium">{selectedEmoji} {newHabitName}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3">
              <Button onClick={addHabit} className="flex-1 bg-black hover:bg-gray-800 text-white">
                Add Habit
              </Button>
              <Button onClick={() => {
                setShowAddHabit(false)
                setNewHabitName('')
                setSelectedEmoji('✨')
                setShowEmojiPicker(false)
              }} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Past Data Modal */}
      {showPastData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-2xl font-bold">Past Months Data</h3>
              <button
                onClick={() => setShowPastData(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPastData ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading past data...</p>
                </div>
              ) : pastMonths.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">No Past Data</h4>
                  <p className="text-gray-500">You don't have any habit tracking data from previous months yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {pastMonths.map((monthData, index) => {
                    const daysInMonth = new Date(monthData.year, monthData.month, 0).getDate()
                    
                    // Calculate completion scores for this month
                    const scores = []
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const dayCompletions = monthData.completions.filter(c => c.completion_date === dateStr)
                      const score = monthData.habits.length > 0 ? (dayCompletions.length / monthData.habits.length) * 100 : 0
                      scores.push(score)
                    }

                    // Chart data for this month
                    const chartData = {
                      labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
                      datasets: [{
                        label: 'Completion',
                        data: scores,
                        borderColor: 'rgb(139, 92, 246)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                      }]
                    }

                    const chartOptions = {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.parsed.y
                            }
                          }
                        },
                        title: {
                          display: false
                        }
                      },
                      layout: {
                        padding: {
                          top: 20,
                          bottom: 10
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 110, // Slightly more than 100 to add padding
                          display: false,
                          ticks: {
                            display: false
                          },
                          grid: {
                            display: false
                          }
                        },
                        x: {
                          grid: { display: false }
                        }
                      }
                    }

                    return (
                      <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-xl font-bold text-gray-800 mb-4">{monthData.monthName}</h4>
                        
                        {/* Chart */}
                        <div className="bg-white rounded-lg p-4 mb-4 h-48 -mt-4 pt-4">
                          <Line data={chartData} options={chartOptions} />
                        </div>

                        {/* Habit Grid */}
                        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                                    Habit
                                  </th>
                                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                    <th key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {monthData.habits.map((habit, habitIndex) => (
                                  <tr key={habit.id} style={{ backgroundColor: habit.color || HABIT_COLORS[habitIndex % HABIT_COLORS.length].value }}>
                                    <td className="px-4 py-2 whitespace-nowrap font-medium text-sm text-gray-800 sticky left-0" style={{ backgroundColor: habit.color || HABIT_COLORS[habitIndex % HABIT_COLORS.length].value }}>
                                      {habit.habit_name}
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                      const dateStr = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                      const completed = monthData.completions.some(c => c.habit_id === habit.id && c.completion_date === dateStr)
                                      
                                      return (
                                        <td key={day} className="px-2 py-2 text-center">
                                          <div className={`w-6 h-6 mx-auto rounded-full border-2 ${
                                            completed 
                                              ? 'bg-purple-600 border-purple-600' 
                                              : 'border-gray-300'
                                          }`}>
                                            {completed && (
                                              <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Guide */}
      {console.log('Avatar Guide render - showGuide:', showGuide, 'loading:', loading, 'avatarManager:', avatarManager)}
      <AvatarGuide
        messages={avatarManager.getPageMessages('habits')}
        isVisible={showGuide && !loading}
        onClose={() => setShowGuide(false)}
        avatarImage={avatarManager.getPageAvatar('habits')}
        avatarName={avatarManager.getPageAvatarName('habits')}
        autoHideDelay={avatarManager.getSettings().autoHideDelay}
        typewriterSpeed={avatarManager.getSettings().typewriterSpeed}
      />

      {/* Completion Avatar */}
      {completionAvatar && (
        <AvatarGuide
          messages={completionAvatar.messages}
          isVisible={true}
          onClose={() => setCompletionAvatar(null)}
          avatarImage={completionAvatar.avatarImage}
          avatarName={completionAvatar.avatarName}
          autoHideDelay={completionAvatar.autoHideDelay}
          typewriterSpeed={completionAvatar.typewriterSpeed}
        />
      )}
    </div>
  )
}
