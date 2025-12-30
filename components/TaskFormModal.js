'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'

const API_BASE = '/backend-api/api'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function TaskFormModal({ onClose, onTaskCreated }) {
  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    task_type: 'SHORT_TERM',
    priority: 'NOTURGENT-NOTIMPORTANT',
    status: 'TO-DO',
    repetition_days: [],
    repetition_time: '',
    deadline_date: '',
    deadline_time: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { getToken } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.task_name.trim()) {
      setError('Task name is required')
      return
    }

    // Validation for deadline
    if (formData.task_type === 'DEADLINE') {
      if (!formData.deadline_date || !formData.deadline_time) {
        setError('Deadline date and time are required')
        return
      }
    }

    setLoading(true)

    try {
      const token = await getToken()
      
      // Create deadline if task_type is DEADLINE
      if (formData.task_type === 'DEADLINE') {
        const deadlineDateTime = `${formData.deadline_date}T${formData.deadline_time}:00Z`
        
        const response = await fetch(`${API_BASE}/deadlines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            task_name: formData.task_name,
            task_description: formData.task_description,
            deadline_time: deadlineDateTime,
            priority: 'MEDIUM'
          }),
        })

        if (response.ok) {
          onTaskCreated()
        } else {
          const errorData = await response.json()
          setError(errorData.detail || 'Failed to create deadline')
        }
      } else {
        // Create regular short term task
        const response = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            task_name: formData.task_name,
            task_description: formData.task_description,
            task_type: formData.task_type,
            priority: formData.priority,
            status: formData.status,
            repetition_days: formData.repetition_days,
            repetition_time: formData.repetition_time
          }),
        })

        if (response.ok) {
          onTaskCreated()
        } else {
          const errorData = await response.json()
          setError(errorData.detail || 'Failed to create task')
        }
      }
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day) => {
    setFormData((prev) => {
      const days = prev.repetition_days || []
      if (days.includes(day)) {
        return { ...prev, repetition_days: days.filter((d) => d !== day) }
      } else {
        return { ...prev, repetition_days: [...days, day] }
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Create New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <Label htmlFor="task_name" className="text-black">Task Name *</Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              placeholder="Enter task name"
              className="mt-2 border-gray-300"
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <Label htmlFor="task_description" className="text-black">Task Description</Label>
            <Textarea
              id="task_description"
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              placeholder="Describe your task..."
              className="mt-2 border-gray-300"
              rows={3}
            />
          </div>

          {/* Task Type */}
          <div>
            <Label className="text-black">Task Type *</Label>
            <RadioGroup
              value={formData.task_type}
              onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SHORT_TERM" id="short_term" />
                <Label htmlFor="short_term" className="font-normal cursor-pointer text-gray-700">
                  Short Term (with repetition)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DEADLINE" id="deadline" />
                <Label htmlFor="deadline" className="font-normal cursor-pointer text-gray-700">
                  Deadline
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Deadline Date/Time - Only show for DEADLINE */}
          {formData.task_type === 'DEADLINE' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label htmlFor="deadline_date" className="text-black">Deadline Date *</Label>
                <Input
                  id="deadline_date"
                  type="date"
                  value={formData.deadline_date}
                  onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                  className="mt-2 border-gray-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deadline_time" className="text-black">Deadline Time *</Label>
                <Input
                  id="deadline_time"
                  type="time"
                  value={formData.deadline_time}
                  onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                  className="mt-2 border-gray-300"
                  required
                />
              </div>
            </div>
          )}

          {/* Priority (Eisenhower Matrix) - Only show for SHORT_TERM */}
          {formData.task_type === 'SHORT_TERM' && (
            <div>
              <Label className="text-black">Priority (Eisenhower Matrix) *</Label>
              <RadioGroup
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="URGENT-IMPORTANT" id="urgent-important" />
                  <Label htmlFor="urgent-important" className="font-normal cursor-pointer text-gray-700">
                    Urgent & Important
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="URGENT-NOTIMPORTANT" id="urgent-not" />
                  <Label htmlFor="urgent-not" className="font-normal cursor-pointer text-gray-700">
                    Urgent but Not Important
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NOTURGENT-IMPORTANT" id="not-urgent" />
                  <Label htmlFor="not-urgent" className="font-normal cursor-pointer text-gray-700">
                    Not Urgent but Important
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NOTURGENT-NOTIMPORTANT" id="neither" />
                  <Label htmlFor="neither" className="font-normal cursor-pointer text-gray-700">
                    Neither Urgent nor Important
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Repetition Days - Only show for SHORT_TERM */}
          {formData.task_type === 'SHORT_TERM' && (
            <div>
              <Label className="text-black">Repetition Days *</Label>
              <div className="mt-2 space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.repetition_days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={day} className="font-normal cursor-pointer text-gray-700">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repetition Time - Only show for SHORT_TERM */}
          {formData.task_type === 'SHORT_TERM' && (
            <div>
              <Label htmlFor="repetition_time" className="text-black">Repetition Time</Label>
              <Input
                id="repetition_time"
                type="time"
                value={formData.repetition_time}
                onChange={(e) => setFormData({ ...formData, repetition_time: e.target.value })}
                className="mt-2 border-gray-300"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-black hover:bg-gray-800 text-white"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
