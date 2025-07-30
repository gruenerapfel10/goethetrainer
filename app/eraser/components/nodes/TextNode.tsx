import React, { useState, useCallback } from 'react'
import { NodeProps } from 'reactflow'
import { TextNodeData } from '../../types'
import { BaseNode, Input, Button, Edit3 } from './shared'
import { useCanvasContext } from '../canvas-context'

// Text Node
export const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected, id }) => {
  const { updateNodeData } = useCanvasContext()
  const [isEditing, setIsEditing] = useState(data.isEditing || false)
  const [tempContent, setTempContent] = useState(data.content || '')

  const handleEdit = () => {
    setIsEditing(true)
    setTempContent(data.content || '')
  }

  const handleSave = () => {
    updateNodeData(data.id, { content: tempContent, isEditing: false })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempContent(data.content || '')
    setIsEditing(false)
    updateNodeData(data.id, { isEditing: false })
  }

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  return (
    <BaseNode 
      data={data} 
      selected={selected}
    >
      <div className="relative">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={tempContent}
              onChange={(e) => setTempContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your text here..."
              className="w-full h-24 p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{
                fontFamily: data.fontFamily || 'Inter, sans-serif',
                fontWeight: data.fontWeight || 'normal',
                textAlign: data.textAlign || 'left',
                fontSize: data.fontSize || '14px',
                color: data.color || '#374151'
              }}
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                className="h-6 px-2 text-xs"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="relative cursor-text hover:bg-gray-50 rounded p-2 min-h-[60px] flex items-center"
            onClick={handleEdit}
          >
            {data.content ? (
              <div 
                className="whitespace-pre-wrap break-words w-full"
                style={{
                  fontFamily: data.fontFamily || 'Inter, sans-serif',
                  fontWeight: data.fontWeight || 'normal',
                  textAlign: data.textAlign || 'left',
                  fontSize: data.fontSize || '14px',
                  color: data.color || '#374151'
                }}
              >
                {data.content}
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic w-full">
                Click to add text...
              </div>
            )}
            
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="h-6 w-6 p-0"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  )
} 