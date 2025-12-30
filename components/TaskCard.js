'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const API_BASE = '/backend-api/api'

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

export default function TaskCard({ task, onUpdate, onCardClick }) {
  const [loading, setLoading] = useState(false)
  const { getToken } = useAuth()

  const deleteTask = async (e) => {
    e.stopPropagation() // Prevent card click when clicking delete
    
    if (!confirm('Are you sure you want to delete this task?')) return
    
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
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
              {/* Priority Badge */}
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

          {/* Task Type & Repetition */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {task.task_type === 'LONG_TERM' ? 'Long Term' : 'Short Term'}
            </Badge>
            {/* Only show repetition for SHORT_TERM tasks */}
            {task.task_type === 'SHORT_TERM' && task.repetition_days && task.repetition_days.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                {task.repetition_days.join(', ')}
              </Badge>
            )}
            {task.task_type === 'SHORT_TERM' && task.repetition_time && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {task.repetition_time}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
