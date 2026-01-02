'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CheckCircle, Target, TrendingUp, Lock, Star } from 'lucide-react'
import Image from 'next/image'

const features = [
  {
    icon: Target,
    title: 'Smart Task Management',
    description: 'Organize your tasks with the Eisenhower Matrix. Focus on what truly matters - urgent vs important.',
    free: true
  },
  {
    icon: CheckCircle,
    title: 'Habit Tracking',
    description: 'Build lasting habits with daily tracking and progress monitoring. Create repeating tasks with custom schedules.',
    free: true
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Visualize your progress with detailed analytics and insights. Track your productivity over time.',
    free: false,
    proOnly: true
  },
  {
    icon: Star,
    title: 'AI-Powered Assistant',
    description: 'Get intelligent task suggestions and planning help from our AI assistant. Make smarter decisions faster.',
    free: false,
    proOnly: true
  },
  {
    icon: Lock,
    title: 'Advanced Features',
    description: 'Unlock premium features like long-term goal tracking, custom workflows, and priority support.',
    free: false,
    proOnly: true
  }
]

export default function FeatureCarousel() {
  const [currentFeature, setCurrentFeature] = useState(0)

  const handleNext = () => {
    if (currentFeature < features.length - 1) {
      setCurrentFeature(currentFeature + 1)
    }
  }

  const handlePrevious = () => {
    if (currentFeature > 0) {
      setCurrentFeature(currentFeature - 1)
    }
  }

  const feature = features[currentFeature]
  const Icon = feature.icon
  const isLastFeature = currentFeature === features.length - 1

  return (
    <div className="w-full max-w-2xl">
      {/* Feature Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`mb-6 rounded-full p-6 ${feature.proOnly ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-black'}`}>
            <Icon className="w-16 h-16 text-white" />
          </div>

          {/* Pro Badge */}
          {feature.proOnly && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <Lock className="w-3 h-3 mr-1" />
                Pro Feature
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {feature.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-8 max-w-md">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-3 mb-8">
        {features.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentFeature 
                ? 'w-8 bg-black' 
                : 'w-2 bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handlePrevious}
          disabled={currentFeature === 0}
          variant="outline"
          size="lg"
          className="font-semibold px-8 py-6 rounded-full"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>

        {isLastFeature ? (
          <Button
            onClick={() => window.location.href = '/pro'}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-12 py-6 text-lg rounded-full shadow-lg"
          >
            Upgrade to Pro
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            size="lg"
            className="bg-black hover:bg-gray-800 text-white font-semibold px-12 py-6 text-lg rounded-full shadow-lg"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
