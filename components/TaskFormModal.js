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

    setLoading(true)

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onTaskCreated()
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create task')
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
                <RadioGroupItem value="LONG_TERM" id="long_term" />
                <Label htmlFor="long_term" className="font-normal cursor-pointer text-gray-700">
                  Long Term Goal
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Priority (Eisenhower Matrix) - Only show for SHORT_TERM */}
          {formData.task_type === 'SHORT_TERM' && (
            <div>
              <Label className="text-black">Priority (Eisenhower Matrix) *</Label>
              <RadioGroup
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-3">
                  <RadioGroupItem value="URGENT-IMPORTANT" id="urgent-important" />
                  <Label htmlFor="urgent-important" className="font-normal cursor-pointer text-gray-700">
                    ⚫ Urgent & Important
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-3">
                  <RadioGroupItem value="URGENT-NOTIMPORTANT" id="urgent-notimportant" />
                  <Label htmlFor="urgent-notimportant" className="font-normal cursor-pointer text-gray-700">
                    ⚫ Urgent Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-3">
                  <RadioGroupItem value="NOTURGENT-IMPORTANT" id="noturgent-important" />
                  <Label htmlFor="noturgent-important" className="font-normal cursor-pointer text-gray-700">
                    ⚫ Important Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-3">
                  <RadioGroupItem value="NOTURGENT-NOTIMPORTANT" id="noturgent-notimportant" />
                  <Label htmlFor="noturgent-notimportant" className="font-normal cursor-pointer text-gray-700">
                    ⚪ Low Priority
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Repetition (only for SHORT_TERM) */}
          {formData.task_type === 'SHORT_TERM' && (
            <>
              <div>
                <Label className="text-black">Repetition Days</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formData.repetition_days?.includes(day)
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

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
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-black hover:bg-gray-800 text-white"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
