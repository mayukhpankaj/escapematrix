'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { X, MoreVertical, Trash2, Type, List, ListOrdered, Image as ImageIcon, Link2, Bold, Italic, Code } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const API_BASE = '/backend-api/api'

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }) {
  const [content, setContent] = useState('')
  const [blocks, setBlocks] = useState([{ id: 1, type: 'paragraph', content: '' }])
  const [saving, setSaving] = useState(false)
  const { getToken } = useAuth()
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    if (isOpen && task) {
      // Load existing content from markdown_content
      if (task.markdown_content) {
        try {
          const parsed = JSON.parse(task.markdown_content)
          setBlocks(parsed)
        } catch {
          // If not JSON, treat as plain text
          setBlocks([{ id: 1, type: 'paragraph', content: task.markdown_content }])
        }
      } else {
        setBlocks([{ id: 1, type: 'paragraph', content: '' }])
      }
    }
  }, [isOpen, task])

  // Auto-save with debounce
  useEffect(() => {
    if (!isOpen || !task) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [blocks])

  const saveContent = async () => {
    if (!task) return

    try {
      setSaving(true)
      const token = await getToken()
      
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          markdown_content: JSON.stringify(blocks)
        }),
      })
    } catch (error) {
      console.error('Error saving content:', error)
    } finally {
      setSaving(false)
    }
  }

  const addBlock = (type = 'paragraph') => {
    const newBlock = {
      id: Date.now(),
      type,
      content: ''
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id, content) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, content } : block
    ))
  }

  const handleBlur = (e, blockId) => {
    // Update content when user stops editing
    updateBlock(blockId, e.currentTarget.textContent)
  }

  const deleteBlock = (id) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(block => block.id !== id))
    }
  }

  const handleKeyDown = (e, blockId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const currentIndex = blocks.findIndex(b => b.id === blockId)
      const newBlock = {
        id: Date.now(),
        type: 'paragraph',
        content: ''
      }
      const newBlocks = [...blocks]
      newBlocks.splice(currentIndex + 1, 0, newBlock)
      setBlocks(newBlocks)
      
      // Focus the new block
      setTimeout(() => {
        const newElement = document.querySelector(`[data-block-id="${newBlock.id}"]`)
        if (newElement) newElement.focus()
      }, 0)
    } else if (e.key === 'Backspace' && e.target.textContent === '') {
      e.preventDefault()
      if (blocks.length > 1) {
        deleteBlock(blockId)
      }
    }
  }

  const renderBlock = (block, index) => {
    const commonProps = {
      key: block.id,
      'data-block-id': block.id,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: (e) => updateBlock(block.id, e.currentTarget.textContent),
      onKeyDown: (e) => handleKeyDown(e, block.id),
      className: "outline-none focus:outline-none min-h-[1.5rem] px-1 py-0.5",
      placeholder: "Type something..."
    }

    switch (block.type) {
      case 'heading1':
        return (
          <h1 {...commonProps} className={`${commonProps.className} text-3xl font-bold mb-2`}>
            {block.content}
          </h1>
        )
      case 'heading2':
        return (
          <h2 {...commonProps} className={`${commonProps.className} text-2xl font-semibold mb-2`}>
            {block.content}
          </h2>
        )
      case 'heading3':
        return (
          <h3 {...commonProps} className={`${commonProps.className} text-xl font-medium mb-1`}>
            {block.content}
          </h3>
        )
      case 'bullet':
        return (
          <div className="flex items-start gap-2 mb-1">
            <span className="mt-2">•</span>
            <div {...commonProps} className={`${commonProps.className} flex-1`}>
              {block.content}
            </div>
          </div>
        )
      case 'numbered':
        return (
          <div className="flex items-start gap-2 mb-1">
            <span className="mt-2">{index + 1}.</span>
            <div {...commonProps} className={`${commonProps.className} flex-1`}>
              {block.content}
            </div>
          </div>
        )
      case 'image':
        return (
          <div className="my-4">
            {block.content ? (
              <img src={block.content} alt="Block image" className="max-w-full rounded-lg" />
            ) : (
              <input
                type="text"
                placeholder="Paste image URL..."
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
              />
            )}
          </div>
        )
      default:
        return (
          <p {...commonProps}>
            {block.content}
          </p>
        )
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black">{task.task_name}</h1>
            {saving && <span className="text-sm text-gray-500">Saving...</span>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this task?')) {
                      await onDelete()
                      onClose()
                    }
                  }}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 overflow-x-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('heading1')}
            title="Heading 1"
          >
            <Type className="w-4 h-4 mr-1" />
            H1
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('heading2')}
            title="Heading 2"
          >
            <Type className="w-4 h-4 mr-1" />
            H2
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('heading3')}
            title="Heading 3"
          >
            <Type className="w-4 h-4 mr-1" />
            H3
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('bullet')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('numbered')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addBlock('image')}
            title="Image"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Editor */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-2">
            {blocks.map((block, index) => (
              <div key={block.id} className="group relative">
                {renderBlock(block, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
