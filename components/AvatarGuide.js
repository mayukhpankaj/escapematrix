'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import Image from 'next/image'

const AvatarGuide = ({ 
  messages = [], 
  isVisible = true, 
  onClose, 
  autoHideDelay = 5000,
  typewriterSpeed = 30,
  avatarImage = null,
  avatarName = 'Guide'
}) => {
  console.log('AvatarGuide props:', { messages, isVisible, avatarImage, avatarName })
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showBubble, setShowBubble] = useState(false)

  const currentMessage = messages[currentMessageIndex] || ''

  // Typewriter effect
  useEffect(() => {
    if (!isVisible || !currentMessage) return

    setIsTyping(true)
    setShowBubble(true)
    setDisplayedText('')

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < currentMessage.length) {
        setDisplayedText(currentMessage.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(interval)
        
        // Auto-hide after delay
        if (autoHideDelay > 0) {
          setTimeout(() => {
            setShowBubble(false)
          }, autoHideDelay)
        }
      }
    }, typewriterSpeed)

    return () => clearInterval(interval)
  }, [currentMessage, isVisible, typewriterSpeed, autoHideDelay])

  // Reset displayed text when message changes
  useEffect(() => {
    setDisplayedText('')
  }, [currentMessageIndex])

  // Cycle through messages
  useEffect(() => {
    if (!isVisible || messages.length <= 1) return

    const cycleMessages = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const nextIndex = (prev + 1) % messages.length
        return nextIndex
      })
    }, autoHideDelay + 2000) // Wait a bit after bubble hides

    return () => clearInterval(cycleMessages)
  }, [isVisible, messages.length, autoHideDelay])

  if (!isVisible || messages.length === 0) {
    console.log('AvatarGuide not rendering - isVisible:', isVisible, 'messages.length:', messages.length)
    return null
  }

  console.log('AvatarGuide rendering with props:', { messages, isVisible, avatarImage, avatarName })

  return (
    <div className="fixed bottom-6 left-6 z-50 hidden md:block lg:block">
      <div className="relative flex items-end">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg animate-bounce overflow-hidden">
            {avatarImage ? (
              <Image 
                src={avatarImage} 
                alt={avatarName}
                width={64}
                height={64}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
            )}
          </div>
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Speech Bubble */}
        {showBubble && (
          <div className="ml-4 mb-8 relative animate-fade-in">
            {/* Bubble tail */}
            <div className="absolute left-0 top-4 -ml-2 w-4 h-4 bg-white transform rotate-45"></div>
            
            {/* Bubble content */}
            <div className="relative bg-white rounded-2xl shadow-xl p-4 max-w-xs border border-gray-100">
              <div className="text-gray-800 text-sm leading-relaxed">
                {displayedText || currentMessage || ''}
                {isTyping && displayedText && (
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default AvatarGuide
