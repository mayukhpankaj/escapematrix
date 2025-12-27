'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, Trash2, AlertCircle } from 'lucide-react'

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

export default function TaskCard({ task, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const { getToken } = useAuth()

  const updateTaskStatus = async (newStatus) => {
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async () => {
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

  return (
    <Card className="hover:shadow-lg transition-shadow border border-gray-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Task Title */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-black line-clamp-2">{task.task_name}</h4>
            {/* Only show priority for SHORT_TERM tasks */}
            {task.task_type === 'SHORT_TERM' && (
              <Badge className={priorityColors[task.priority] || priorityColors['NOTURGENT-NOTIMPORTANT']}>
                {task.priority === 'URGENT-IMPORTANT' && <AlertCircle className="w-3 h-3 mr-1" />}
                {priorityLabels[task.priority]?.split(' ')[0]}
              </Badge>
            )}
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            {task.status === 'TO-DO' && (
              <Button
                onClick={() => updateTaskStatus('IN-PROGRESS')}
                disabled={loading}
                size="sm"
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                <Clock className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            {task.status === 'IN-PROGRESS' && (
              <Button
                onClick={() => updateTaskStatus('COMPLETED')}
                disabled={loading}
                size="sm"
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
            {task.status === 'COMPLETED' && (
              <Button
                onClick={() => updateTaskStatus('TO-DO')}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Reopen
              </Button>
            )}
            <Button
              onClick={deleteTask}
              disabled={loading}
              size="sm"
              variant="destructive"
              className="px-3 bg-gray-800 hover:bg-black text-white"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
