'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { TrendingUp, ListTodo, Target, Zap, Menu, X } from 'lucide-react'
import Image from 'next/image'
import useUserStore from '@/store/userStore'
import { Radar, Bar } from 'react-chartjs-2'
import AvatarGuide from '@/components/AvatarGuide'
import avatarManager from '@/utils/avatarManager'
import useProGuard from '@/hooks/use-pro-guard'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const API_BASE = '/backend-api/api'

// Simple in-memory cache for 30 seconds
const cache = new Map()
const CACHE_TTL = 30000

const getCached = (key) => {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data
  }
  cache.delete(key)
  return null
}

const setCached = (key, data) => {
  cache.set(key, { data, ts: Date.now() })
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const safePct = (num, den) => {
  if (!den || den <= 0) return 0
  return (num / den) * 100
}

const toISODate = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const parseDateLike = (value) => {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

export default function HomePage() {
  const router = useRouter()
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUser, fullName } = useUserStore()
  const { checking } = useProGuard()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(true)
  const [completionAvatar, setCompletionAvatar] = useState(null)

  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState([])

  const [tasks, setTasks] = useState({ 'TO-DO': [], 'IN-PROGRESS': [], 'COMPLETED': [] })
  const [deadlines, setDeadlines] = useState([])

  const [monthlyData, setMonthlyData] = useState([])

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
    if (!isSignedIn) return
    const run = async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const cacheKey = `home-${year}-${month}`

        // Try cache first
        const cached = getCached(cacheKey)
        if (cached) {
          setHabits(cached.habits)
          setCompletions(cached.completions)
          setTasks(cached.tasks)
          setDeadlines(cached.deadlines)
          setMonthlyData(cached.monthlyData)
          setLoading(false)
          return
        }

        // Fetch base data and monthly progress in parallel
        const [habitsRes, completionsRes, tasksRes, deadlinesRes, monthlyProgressRes] = await Promise.all([
          fetch(`${API_BASE}/habits`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/habits/completions/${year}/${month}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/deadlines`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/monthly-progress/${year}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        ])

        const habitsData = habitsRes.ok ? await habitsRes.json() : []
        const completionsData = completionsRes.ok ? await completionsRes.json() : []
        const tasksData = tasksRes.ok ? await tasksRes.json() : {}
        const deadlinesData = deadlinesRes.ok ? await deadlinesRes.json() : []
        const monthlyProgressData = monthlyProgressRes.ok ? await monthlyProgressRes.json() : []

        setHabits(Array.isArray(habitsData) ? habitsData : [])
        setCompletions(Array.isArray(completionsData) ? completionsData : [])

        const filteredTasks = {
          'TO-DO': [],
          'IN-PROGRESS': [],
          'COMPLETED': []
        }

        Object.keys(tasksData || {}).forEach(status => {
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

        const normalizedDeadlines = Array.isArray(deadlinesData) ? deadlinesData : []
        normalizedDeadlines.forEach(deadline => {
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
        setDeadlines(normalizedDeadlines)

        // Process monthly progress data
        const monthly = []
        const currentMonth = month - 1 // zero-based for Date
        const currentYear = year

        // If no monthly progress data exists, trigger recalculation
        if (!monthlyProgressData || monthlyProgressData.length === 0) {
          console.log('No monthly progress data found, triggering recalculation...')
          await fetch(`${API_BASE}/monthly-progress/recalculate/${year}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          // Fetch the newly calculated data
          const newProgressRes = await fetch(`${API_BASE}/monthly-progress/${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const newProgressData = newProgressRes.ok ? await newProgressRes.json() : []
          
          // Process the new data
          for (let m = 0; m < 12; m++) {
            const targetDate = new Date(currentYear, m, 1)
            const progress = newProgressData.find(p => p.month === m + 1)
            
            monthly.push({
              month: targetDate.toLocaleString('default', { month: 'short' }),
              year: currentYear,
              monthIndex: m,
              completed: progress ? progress.completed_tasks : 0,
              maxStreak: progress ? progress.max_streak_days : 0,
              streakScore: progress ? progress.streak_score : 0,
              rawScore: progress ? progress.raw_score : 0,
              isCurrent: m === currentMonth,
              isFuture: m > currentMonth,
            })
          }
        } else {
          // Process existing monthly progress data
          for (let m = 0; m < 12; m++) {
            const targetDate = new Date(currentYear, m, 1)
            const progress = monthlyProgressData.find(p => p.month === m + 1)
            
            monthly.push({
              month: targetDate.toLocaleString('default', { month: 'short' }),
              year: currentYear,
              monthIndex: m,
              completed: progress ? progress.completed_tasks : 0,
              maxStreak: progress ? progress.max_streak_days : 0,
              streakScore: progress ? progress.streak_score : 0,
              rawScore: progress ? progress.raw_score : 0,
              isCurrent: m === currentMonth,
              isFuture: m > currentMonth,
            })
          }
        }

        setMonthlyData(monthly)

        // Cache the results
        setCached(cacheKey, {
          habits: Array.isArray(habitsData) ? habitsData : [],
          completions: Array.isArray(completionsData) ? completionsData : [],
          tasks: filteredTasks,
          deadlines: normalizedDeadlines,
          monthlyData: monthly,
        })
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isSignedIn, getToken])

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

  const metrics = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)

    const daysElapsed = today.getDate()
    const habitsCount = Array.isArray(habits) ? habits.length : 0

    const completionDates = new Map()
    const completionByDate = new Map()

    for (const c of completions || []) {
      const dateStr = c.completion_date
      if (!dateStr) continue
      const dt = parseDateLike(dateStr)
      if (!dt) continue

      const d = startOfDay(dt)
      if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth()) continue
      if (d > today) continue

      const iso = toISODate(d)
      completionDates.set(iso, true)

      const prev = completionByDate.get(iso) || 0
      completionByDate.set(iso, prev + 1)
    }

    const D_total = habitsCount * daysElapsed
    const D_completed = (completions || []).filter(c => {
      const dt = parseDateLike(c.completion_date)
      if (!dt) return false
      const d = startOfDay(dt)
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d <= today
    }).length

    const baseConsistency = safePct(D_completed, D_total)

    let streakDays = 0
    if (habitsCount > 0) {
      for (let i = 0; i < daysElapsed; i++) {
        const d = addDays(today, -i)
        const iso = toISODate(d)
        const count = completionByDate.get(iso) || 0
        const dayIsPerfect = count >= habitsCount
        if (!dayIsPerfect) break
        streakDays += 1
      }
    }

    const consistency = clamp(baseConsistency + Math.min(streakDays * 1.5, 10), 0, 100)

    const allTasks = [...(tasks['TO-DO'] || []), ...(tasks['IN-PROGRESS'] || []), ...(tasks['COMPLETED'] || [])]

    const T_created = allTasks.length
    const T_done = (tasks['COMPLETED'] || []).length

    const completionRate = safePct(T_done, T_created)

    const completionDaySet = new Set()

    for (const t of tasks['COMPLETED'] || []) {
      const completedAt = parseDateLike(t.updated_at) || parseDateLike(t.created_at)
      if (!completedAt) continue
      completionDaySet.add(toISODate(startOfDay(completedAt)))
    }

    const Days_active = completionDaySet.size
    const crunchRaw = Days_active > 0 ? (T_done / Days_active) : 0
    const expectedMax = 10
    const crunchScore = clamp(safePct(crunchRaw, expectedMax), 0, 100)

    const completedDeadlines = (deadlines || []).filter(d => d.status === 'COMPLETED')
    const T_done_with_due = completedDeadlines.length

    let T_on_time = 0
    for (const d of completedDeadlines) {
      const due = parseDateLike(d.deadline_time)
      const completedAt = parseDateLike(d.updated_at) || parseDateLike(d.start_time)
      if (!due || !completedAt) continue
      if (completedAt <= due) T_on_time += 1
    }

    const timeliness = safePct(T_on_time, T_done_with_due)

    return {
      consistency,
      completionRate,
      crunchScore,
      timeliness,
      debug: {
        D_completed,
        D_total,
        streakDays,
        T_done,
        T_created,
        Days_active,
        T_on_time,
        T_done_with_due,
      }
    }
  }, [habits, completions, tasks, deadlines])

  const chartData = useMemo(() => {
    return {
      labels: ['Consistency', 'Completion', 'Crunch', 'Timeliness'],
      datasets: [
        {
          label: 'Score',
          data: [
            Math.round(metrics.consistency),
            Math.round(metrics.completionRate),
            Math.round(metrics.crunchScore),
            Math.round(metrics.timeliness),
          ],
          fill: true,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgb(139, 92, 246)',
          pointBackgroundColor: 'rgb(139, 92, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(139, 92, 246)',
        }
      ]
    }
  }, [metrics])

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent'
          },
          pointLabels: {
            font: {
              size: 12,
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw}%`
          }
        }
      }
    }
  }, [])

  const barData = useMemo(() => {
    const labels = monthlyData.map(d => `${d.month} ${d.year}`)
    const rawScores = monthlyData.map(d => d.rawScore)

    const maxExpected = 200
    const normalized = rawScores.map(v => Math.min((v / maxExpected) * 100, 100))

    return {
      labels,
      datasets: [
        {
          label: 'Monthly Score (Tasks + Streaks)',
          data: normalized,
          backgroundColor: monthlyData.map(d => d.isFuture ? '#e5e7eb' : d.isCurrent ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.6)'),
          borderColor: monthlyData.map(d => d.isFuture ? '#d1d5db' : d.isCurrent ? 'rgb(139, 92, 246)' : 'rgba(139, 92, 246, 1)'),
          borderWidth: 1,
        }
      ]
    }
  }, [monthlyData])

  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            stepSize: 20,
            callback: (value) => `${value}%`
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = monthlyData[ctx.dataIndex]
              if (!item) return ''
              return [
                `Score: ${Math.round(item.rawScore)} (${Math.round(ctx.raw)}%)`,
                `Completed: ${item.completed}`,
                `Streak: ${item.maxStreak} days`,
                `Streak bonus: ${item.streakScore.toFixed(1)}`
              ]
            }
          }
        }
      }
    }
  }, [monthlyData])

  if (checking || !isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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
                className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
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

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-4 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">Progress</h2>
                <p className="text-gray-500 text-sm">Performance stats</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Radar</h3>
                  <div className="h-[360px]">
                    <Radar data={chartData} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700 font-medium">Consistency Score</div>
                      <div className="text-gray-900 font-semibold">{Math.round(metrics.consistency)}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700 font-medium">Task Completion Rate</div>
                      <div className="text-gray-900 font-semibold">{Math.round(metrics.completionRate)}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700 font-medium">Productivity / Crunch</div>
                      <div className="text-gray-900 font-semibold">{Math.round(metrics.crunchScore)}%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700 font-medium">Timeliness Score</div>
                      <div className="text-gray-900 font-semibold">{Math.round(metrics.timeliness)}%</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button onClick={() => router.push('/task')} className="bg-black hover:bg-gray-800 text-white">
                      Go to Tasks
                    </Button>
                    <Button onClick={() => router.push('/habits')} variant="outline">
                      Go to Streaks
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Progress (Tasks + Streaks)</h3>
                <div className="h-[320px]">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Avatar Guide */}
      <AvatarGuide
        messages={avatarManager.getPageMessages('progress')}
        isVisible={showGuide && !loading}
        onClose={() => setShowGuide(false)}
        avatarImage={avatarManager.getPageAvatar('progress')}
        avatarName={avatarManager.getPageAvatarName('progress')}
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
