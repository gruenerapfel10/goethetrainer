import React, { useState, useRef, useEffect, useCallback } from 'react'
import { NodeProps } from 'reactflow'
import { NoteNodeData } from '../../types'
import { BaseNode, Button, Eye, EyeOff, Edit3 } from './shared'
import { WysiwygEditor } from '../wysiwyg-editor'
import { useCanvasContext } from '../canvas-context'

export const NoteNode: React.FC<NodeProps<NoteNodeData>> = ({ data, selected, id }) => {
  const { updateNodeData } = useCanvasContext()
  const [isEditing, setIsEditing] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Handle content changes with optimized debouncing
  const handleContentChange = useCallback((newContent: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(() => {
      updateNodeData(data.id, { description: newContent })
    }, 300)

    setAutoSaveTimeout(timeout)
  }, [autoSaveTimeout, updateNodeData, data.id])

  // Auto-resize functionality
  const handleResize = useCallback((width: number, height: number) => {
    // Handle any custom resize logic if needed
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
    setShowTools(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    setTimeout(() => setShowTools(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
    }
  }, [autoSaveTimeout])

  if (data.isMinimized) {
    return (
      <BaseNode 
        data={data} 
        selected={selected}
        showHeader={false}
        className="note-node-minimized bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50"
        style={{ cursor: 'pointer' }}
        onResize={handleResize}
      >
        <div 
          className="p-3"
          onClick={() => updateNodeData(data.id, { isMinimized: false })}
        >
          <div className="flex items-center gap-2">
            <div className="text-amber-500">📝</div>
            <span className="text-sm font-medium text-gray-700 truncate">
              {data.title || 'Untitled Note'}
            </span>
          </div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-1 truncate">
              {data.description.replace(/<[^>]*>/g, '').slice(0, 50)}...
            </div>
          )}
        </div>
      </BaseNode>
    )
  }

  return (
    <BaseNode 
      data={data} 
      selected={selected}
      showHeader={false}
      className="note-node-container group"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 248, 235, 0.8), rgba(255, 255, 255, 0.9))',
        border: '1px solid rgba(251, 191, 36, 0.2)',
      }}
      onResize={handleResize}
    >
      <div 
        className="h-full overflow-hidden"
        onMouseEnter={() => setShowTools(true)}
        onMouseLeave={() => !isEditing && setShowTools(false)}
      >
        {/* Floating Toolbar */}
        {(showTools || selected) && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateNodeData(data.id, { showMarkdown: !data.showMarkdown })}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              {data.showMarkdown ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateNodeData(data.id, { isMinimized: true })}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              ✕
            </Button>
          </div>
        )}

        {/* Note Header */}
        <div className="note-header border-b border-amber-100/50 bg-gradient-to-r from-amber-50/50 to-white/50 p-4">
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => updateNodeData(data.id, { title: e.target.value })}
            placeholder="Untitled"
            className="w-full text-lg font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 focus:placeholder-gray-300"
          />
          
          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{new Date().toLocaleDateString()}</span>
            {data.description && (
              <span>{data.description.replace(/<[^>]*>/g, '').split(' ').length} words</span>
            )}
          </div>
        </div>

        {/* Note Content */}
        <div 
          ref={editorRef}
          className="note-content flex-1 p-4 overflow-y-auto"
          style={{ 
            height: `${(data.height || 270) - 120}px`,
            maxHeight: `${(data.height || 270) - 120}px`
          }}
        >
          <div 
            className="cursor-text min-h-full"
            onClick={handleEdit}
          >
            {data.showMarkdown || isEditing ? (
              <WysiwygEditor
                content={data.description || ''}
                onChange={handleContentChange}
                onBlur={handleBlur}
                className="border-none shadow-none bg-transparent p-0 focus:ring-0"
                placeholder="Start writing your note..."
              />
            ) : (
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: data.description || '<p class="text-gray-400 italic">Click to start writing...</p>' 
                }}
              />
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="note-footer border-t border-amber-100/50 bg-gradient-to-r from-white/50 to-amber-50/30 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                📝 Note
              </span>
              {data.status && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {data.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing && (
                <span className="text-green-600">● Editing</span>
              )}
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </BaseNode>
  )
} 