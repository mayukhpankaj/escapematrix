'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Menu, X, ListTodo, Target, Sparkles, Send, Loader2, Phone, CalendarDays } from 'lucide-react'
import Image from 'next/image'
import useUserStore from '@/store/userStore'

const API_BASE = '/backend-api/api'

export default function AIPage() {
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!query.trim() || loading) return

    const userMessage = query.trim()
    setQuery('')

    // Add user message to chat
    const newMessages = [...messages, { type: 'human', text: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const token = await getToken()
      
      // Convert messages to API format: {role: 'user'|'ai', content: string}
      const apiMessages = newMessages.map(msg => ({
        role: msg.type === 'human' ? 'user' : 'ai',
        content: msg.text
      }))
      
      const response = await fetch(`${API_BASE}/processquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (response.ok) {
        const data = await response.json()
        // Add AI response to chat
        setMessages(prev => [...prev, { type: 'ai', text: data.message }])
      } else {
        // Handle different error types
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = 'Sorry, I encountered an error. Please try again.'
        
        if (response.status === 504) {
          errorMessage = '⏱️ The AI is taking too long to respond. Please try a shorter message or simpler request.'
        } else if (response.status === 503) {
          errorMessage = '🔧 AI service is temporarily unavailable. Please try again in a moment.'
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        }
        
        setMessages(prev => [...prev, { 
          type: 'ai', 
          text: errorMessage
        }])
      }
    } catch (error) {
      console.error('Error processing query:', error)
      let errorMessage = 'Sorry, I encountered an error. Please try again.'
      
      // Handle network timeout
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = '⏱️ Request timed out. Please check your connection and try again.'
      }
      
      setMessages(prev => [...prev, { 
        type: 'ai', 
        text: errorMessage
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

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
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
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
              <button
                onClick={() => router.push('/habits')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-gray-700"
              >
                <CalendarDays className="w-5 h-5" />
                Daily Habit Tracker
              </button>
              <button
                onClick={() => router.push('/ai')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-lg font-medium"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">AI Assistant</h2>
              <p className="text-sm text-gray-500">Ask me anything about your tasks and goals</p>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Start a conversation</h3>
                <p className="text-gray-500">Ask me to help you plan tasks, set goals, or organize your work</p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'human' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl rounded-2xl px-6 py-4 ${msg.type === 'human' ? 'bg-purple-600 text-white' : 'bg-white shadow-md text-gray-800'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-2xl px-6 py-4 bg-white shadow-md">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t bg-white p-6">
          <form onSubmit={handleSubmit} className="flex space-x-4 max-w-4xl mx-auto">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !query.trim()} className="bg-purple-600 hover:bg-purple-700">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
