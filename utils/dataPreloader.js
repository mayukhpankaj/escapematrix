// Utility for preloading home data in background
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

const parseDateLike = (value) => {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const toISODate = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const preloadHomeData = async (getToken) => {
  try {
    const token = await getToken()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const cacheKey = `home-${year}-${month}`

    // Check if already cached
    if (getCached(cacheKey)) {
      return
    }

    // Fetch all home data in parallel
    const [
      habitsRes,
      completionsRes,
      tasksRes,
      deadlinesRes,
      monthlyProgressRes
    ] = await Promise.all([
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
    let monthlyProgressData = monthlyProgressRes.ok ? await monthlyProgressRes.json() : []

    // Process tasks data
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

    // Process deadlines data
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

    // Process monthly progress data
    const monthly = []
    const currentMonth = month - 1 // zero-based for Date
    const currentYear = year

    // If no monthly progress data exists, trigger recalculation
    if (!monthlyProgressData || monthlyProgressData.length === 0) {
      await fetch(`${API_BASE}/monthly-progress/recalculate/${year}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // Fetch the newly calculated data
      const newProgressRes = await fetch(`${API_BASE}/monthly-progress/${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      monthlyProgressData = newProgressRes.ok ? await newProgressRes.json() : []
    }

    // Process the monthly data
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

    // Cache the processed data
    setCached(cacheKey, {
      habits: Array.isArray(habitsData) ? habitsData : [],
      completions: Array.isArray(completionsData) ? completionsData : [],
      tasks: filteredTasks,
      deadlines: normalizedDeadlines,
      monthlyData: monthly,
    })

    console.log('Home data preloaded and cached successfully')
  } catch (error) {
    console.error('Error preloading home data:', error)
  }
}
