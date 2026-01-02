'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { X, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin, linkPlugin, linkDialogPlugin, imagePlugin, tablePlugin, toolbarPlugin, UndoRedo, BoldItalicUnderlineToggles, ListsToggle, BlockTypeSelect, CreateLink, InsertTable, InsertThematicBreak } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Try importing BlockTypeSelect separately
// import { BlockTypeSelect } from '@mdxeditor/editor/ui/BlockTypeSelect'

const API_BASE = '/api'

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }) {
  const [markdown, setMarkdown] = useState('')
  const [saving, setSaving] = useState(false)
  const [blockTypeDropdownOpen, setBlockTypeDropdownOpen] = useState(false)
  const { getToken } = useAuth()
  const hasChanges = useRef(false)
  const editorRef = useRef(null)

  useEffect(() => {
    if (isOpen && task) {
      // Add class to body when modal opens
      document.body.classList.add('modal-open')
      
      // Try to load from localStorage first (for unsaved changes)
      const localStorageKey = `task-${task.id}-content`
      const savedContent = localStorage.getItem(localStorageKey)
      
      if (savedContent) {
        setMarkdown(savedContent)
      } else {
        loadFromDatabase()
      }
      
      hasChanges.current = false
    }
    
    return () => {
      // Remove class from body when modal closes
      document.body.classList.remove('modal-open')
    }
  }, [isOpen, task])

  const loadFromDatabase = () => {
    if (task.markdown_content) {
      try {
        // If it's JSON (old format), extract plain text
        const parsed = JSON.parse(task.markdown_content)
        if (Array.isArray(parsed)) {
          // Convert old block format to markdown
          const markdownText = parsed.map(block => {
            switch (block.type) {
              case 'heading1':
                return `# ${block.content}`
              case 'heading2':
                return `## ${block.content}`
              case 'heading3':
                return `### ${block.content}`
              case 'bullet':
                return `- ${block.content}`
              case 'numbered':
                return `1. ${block.content}`
              case 'image':
                return block.content ? `![image](${block.content})` : ''
              default:
                return block.content
            }
          }).join('\n\n')
          setMarkdown(markdownText)
        } else {
          setMarkdown(task.markdown_content)
        }
      } catch {
        // If it's not JSON, treat it as plain markdown
        setMarkdown(task.markdown_content)
      }
    } else {
      setMarkdown('')
    }
  }

  // Save to localStorage whenever markdown changes
  useEffect(() => {
    if (isOpen && task && hasChanges.current) {
      const localStorageKey = `task-${task.id}-content`
      localStorage.setItem(localStorageKey, markdown)
    }
  }, [markdown, isOpen, task])

  const saveToBackend = async () => {
    if (!task) return

    try {
      setSaving(true)
      const token = await getToken()
      
      console.log('Saving to backend:', {
        taskId: task.id,
        markdownLength: markdown.length,
        hasChanges: hasChanges.current,
        token: token ? 'present' : 'missing'
      })
      
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          markdown_content: markdown
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Save failed with status:', response.status)
        console.error('Error response:', errorText)
        throw new Error(`Failed to save: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log('Save successful:', responseData)
      
      // Clear localStorage after successful save
      const localStorageKey = `task-${task.id}-content`
      localStorage.removeItem(localStorageKey)
      
      hasChanges.current = false
      
      // Refresh parent task list to get updated task
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error saving content:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkdownChange = (value) => {
    setMarkdown(value)
    hasChanges.current = true
  }

  const handleClose = async () => {
    if (hasChanges.current) {
      await saveToBackend()
    }
    onClose()
  }

  // Custom block type formatting functions
  const applyBlockType = (blockType) => {
    console.log('Applying block type:', blockType)
    
    let formattedText = ''
    switch (blockType) {
      case 'paragraph':
        formattedText = ''
        break
      case 'heading1':
        formattedText = '# '
        break
      case 'heading2':
        formattedText = '## '
        break
      case 'heading3':
        formattedText = '### '
        break
      case 'heading4':
        formattedText = '#### '
        break
      case 'heading5':
        formattedText = '##### '
        break
      case 'heading6':
        formattedText = '###### '
        break
      case 'quote':
        formattedText = '> '
        break
      case 'bullet':
        formattedText = '- '
        break
      case 'numbered':
        formattedText = '1. '
        break
      default:
        formattedText = ''
    }

    // Simply append the formatting to the current markdown
    const newMarkdown = markdown ? `${markdown}\n${formattedText}` : formattedText
    
    console.log('New markdown:', newMarkdown)
    
    // Update markdown state
    setMarkdown(newMarkdown)
    hasChanges.current = true
    
    setBlockTypeDropdownOpen(false)
  }

  const blockTypes = [
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'heading1', label: 'Heading 1' },
    { value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' },
    { value: 'heading4', label: 'Heading 4' },
    { value: 'heading5', label: 'Heading 5' },
    { value: 'heading6', label: 'Heading 6' },
    { value: 'quote', label: 'Quote' },
    { value: 'bullet', label: 'Bullet List' },
    { value: 'numbered', label: 'Numbered List' }
  ]

  // Debug function to check BlockTypeSelect
  useEffect(() => {
    if (isOpen) {
      console.log('TaskDetailModal opened, checking BlockTypeSelect...')
      setTimeout(() => {
        const blockTypeSelect = document.querySelector('.blocktype-select')
        console.log('BlockTypeSelect element found:', blockTypeSelect)
        if (blockTypeSelect) {
          console.log('BlockTypeSelect styles:', window.getComputedStyle(blockTypeSelect))
        }
      }, 1000)
    }
  }, [isOpen])

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
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MDX Editor */}
        <div className="flex-1 overflow-hidden">
          <div className="mdx-editor h-full">
            <MDXEditor 
              ref={editorRef}
              markdown={markdown}
              onChange={handleMarkdownChange}
              plugins={[
                headingsPlugin({ 
                  allowedHeadingLevels: [1, 2, 3, 4, 5, 6] 
                }),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                imagePlugin(),
                tablePlugin(),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <DropdownMenu open={blockTypeDropdownOpen} onOpenChange={setBlockTypeDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300">
                            Block Type
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {blockTypes.map((type) => (
                            <DropdownMenuItem
                              key={type.value}
                              onClick={() => applyBlockType(type.value)}
                            >
                              {type.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <BoldItalicUnderlineToggles />
                      <ListsToggle />
                      <CreateLink />
                      <InsertTable />
                      <InsertThematicBreak />
                    </>
                  ),
                  toolbarPluginOptions: {
                    shouldToolbarPersist: false,
                  }
                }),
              ]}
              contentEditableClassName="prose prose-lg max-w-none min-h-[200px] p-4"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
