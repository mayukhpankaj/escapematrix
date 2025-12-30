'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Menu, X, ListTodo, Target, Sparkles, Send, Loader2, Phone } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
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
          {/* Top Section */}
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

          {/* Bottom Section */}
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
        <main className="flex-1 flex flex-col h-screen">
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-black">AI Assistant</h2>
                <p className="text-gray-500 mt-1">Ask me anything about your tasks and goals</p>
              </div>

              {/* Messages */}
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="bg-black rounded-full p-6 mb-4">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">How can I help you today?</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Ask me anything about your tasks, habits, or productivity goals
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mb-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'human' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                          message.type === 'human'
                            ? 'bg-black text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Thinking bubble */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 border-gray-300 focus:border-black focus:ring-black"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="bg-black hover:bg-gray-800 text-white px-6"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
