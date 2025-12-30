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
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <CalendarDays className="w-5 h-5 mr-3" />
            Daily Habit Tracker
          </button>
          <button
            onClick={() => router.push('/ai')}
            className="flex items-center w-full px-4 py-3 text-white bg-purple-600 rounded-lg"
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
      <main className="flex-1 lg:ml-64 flex flex-col">
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
