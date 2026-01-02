'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, MoreVertical, Trash2, Calendar } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const API_BASE = '/api'

const priorityColors = {
  'URGENT-IMPORTANT': 'bg-red-100 text-red-800',
  'URGENT-NOTIMPORTANT': 'bg-orange-100 text-orange-800',
  'NOTURGENT-IMPORTANT': 'bg-blue-100 text-blue-800',
  'NOTURGENT-NOTIMPORTANT': 'bg-gray-100 text-gray-800',
}

const priorityLabels = {
  'URGENT-IMPORTANT': 'Urgent & Important',
  'URGENT-NOTIMPORTANT': 'Urgent',
  'NOTURGENT-IMPORTANT': 'Important',
  'NOTURGENT-NOTIMPORTANT': 'Low Priority',
}

const getTimeRemaining = (deadlineTime) => {
  const now = new Date()
  const deadline = new Date(deadlineTime)
  const diff = deadline - now
  
  if (diff <= 0) {
    return { text: 'Overdue', isOverdue: true }
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return { text: `${days}d ${hours}h ${minutes}m`, isOverdue: false }
  } else if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, isOverdue: false }
  } else {
    return { text: `${minutes}m`, isOverdue: false }
  }
}

export default function TaskCard({ task, onUpdate, onCardClick }) {
  const [loading, setLoading] = useState(false)
  const { getToken } = useAuth()

  const deleteTask = async (e) => {
    e.stopPropagation() // Prevent card click when clicking delete
    
    if (!confirm('Are you sure you want to delete this task?')) return
    
    setLoading(true)
    try {
      const token = await getToken()
      
      // Check if it's a deadline or regular task
      const endpoint = task.isDeadline 
        ? `${API_BASE}/deadlines/${task.id}`
        : `${API_BASE}/tasks/${task.id}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(task)
    }
  }

  const timeRemaining = task.isDeadline ? getTimeRemaining(task.deadline_time) : null

  return (
    <Card 
      className="hover:shadow-lg transition-shadow border border-gray-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Task Title & Menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-black line-clamp-2">{task.task_name}</h4>
            </div>
            <div className="flex items-center gap-2">
              {/* Priority Badge - Only for SHORT_TERM */}
              {task.task_type === 'SHORT_TERM' && (
                <Badge className={priorityColors[task.priority] || priorityColors['NOTURGENT-NOTIMPORTANT']}>
                  {task.priority === 'URGENT-IMPORTANT' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {priorityLabels[task.priority]?.split(' ')[0]}
                </Badge>
              )}
              {/* Three-dot Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  disabled={loading}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={deleteTask}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Task Description */}
          {task.task_description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.task_description}</p>
          )}

          {/* Task Type & Details */}
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Only show repetition for SHORT_TERM tasks - NO "Short Term" badge */}
            {task.task_type === 'SHORT_TERM' && task.repetition_days && task.repetition_days.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                {task.repetition_days.slice(0, 3).map(d => d.substring(0, 3)).join(', ')}
                {task.repetition_days.length > 3 && '...'}
              </Badge>
            )}
            {task.task_type === 'SHORT_TERM' && task.repetition_time && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                {task.repetition_time}
              </Badge>
            )}
            
            {/* Time Remaining for Deadlines */}
            {task.isDeadline && timeRemaining && (
              <Badge 
                variant="outline" 
                className={timeRemaining.isOverdue 
                  ? "bg-red-50 text-red-700 border-red-200" 
                  : "bg-orange-50 text-orange-700 border-orange-200"
                }
              >
                <Calendar className="w-3 h-3 mr-1" />
                {timeRemaining.isOverdue ? '⚠️ ' : ''}
                {timeRemaining.text}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
