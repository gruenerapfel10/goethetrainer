import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { 
  Edit3, 
  Copy, 
  Trash2, 
  MessageSquare, 
  Activity, 
  CheckCircle, 
  Circle,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react'
import { NodeData } from '../../types'
import { useCanvasContext } from '../canvas-context'

// Ownership Avatar Component
interface OwnershipAvatarProps {
  ownerId: string
  ownerName: string
  ownerAvatar?: string
}

export const OwnershipAvatar: React.FC<OwnershipAvatarProps> = ({
  ownerId,
  ownerName,
  ownerAvatar
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="absolute -top-2 -left-2 z-20">
      <Avatar className="w-6 h-6 border-2 border-white shadow-md">
        <AvatarImage src={ownerAvatar} alt={ownerName} />
        <AvatarFallback className="text-xs bg-blue-500 text-white">
          {ownerAvatar ? null : <User className="w-3 h-3" />}
          {ownerAvatar ? getInitials(ownerName) : null}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}

// Base node component that all nodes should extend
interface BaseNodeProps {
  children: React.ReactNode
  data: NodeData
  selected?: boolean
  className?: string
  style?: React.CSSProperties
  showHandles?: boolean
  showHeader?: boolean
  showResizeHandles?: boolean
  onResize?: (width: number, height: number) => void
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  children,
  data,
  selected = false,
  className = '',
  style = {},
  showHandles = true,
  showHeader = true,
  showResizeHandles = true,
  onResize
}) => {
  const { updateNodeData, toggleNodeMinimized, copyNode, deleteNode } = useCanvasContext()
  const { getNodes, setNodes } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(data.title)
  const nodeRef = useRef<HTMLDivElement>(null)

  const statusColors = {
    inactive: 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm',
    todo: 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm',
    working: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
    'in-progress': 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
    blocked: 'bg-red-50 text-red-700 border-red-200 shadow-sm',
    review: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm',
    paused: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
  }

  const statusIcons = {
    inactive: Circle,
    todo: Circle,
    working: Activity,
    'in-progress': Activity,
    complete: CheckCircle,
    done: CheckCircle,
    blocked: AlertTriangle,
    review: Eye,
    paused: Clock
  }

  const statusLabels = {
    inactive: 'Not Started',
    todo: 'To Do',
    working: 'In Progress',
    'in-progress': 'In Progress',
    complete: 'Complete',
    done: 'Done',
    blocked: 'Blocked',
    review: 'Review',
    paused: 'Paused'
  }

  const handleTitleEdit = useCallback(() => {
    setIsEditing(true)
    setEditValue(data.title)
  }, [data.title])

  const handleTitleSave = useCallback(() => {
    updateNodeData(data.id, { title: editValue })
    setIsEditing(false)
  }, [editValue, updateNodeData, data.id])

  const handleTitleCancel = useCallback(() => {
    setEditValue(data.title)
    setIsEditing(false)
  }, [data.title])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }, [handleTitleSave, handleTitleCancel])

  // Enhanced resize with proper React Flow integration
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation()
    e.preventDefault()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = data.width || 480
    const startHeight = data.height || 270
    
    const currentNode = getNodes().find((n: any) => n.id === data.id)
    const startPosition = currentNode?.position || { x: 0, y: 0 }
    
    let frameId: number | null = null
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.stopPropagation()
      moveEvent.preventDefault()
      
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
      
      frameId = requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY
        
        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startPosition.x
        let newY = startPosition.y
        
        switch (corner) {
          case 'top-left':
            newWidth = Math.max(200, startWidth - deltaX)
            newHeight = Math.max(120, startHeight - deltaY)
            newX = startPosition.x + (startWidth - newWidth)
            newY = startPosition.y + (startHeight - newHeight)
            break
            
          case 'top-right':
            newWidth = Math.max(200, startWidth + deltaX)
            newHeight = Math.max(120, startHeight - deltaY)
            newY = startPosition.y + (startHeight - newHeight)
            break
            
          case 'bottom-left':
            newWidth = Math.max(200, startWidth - deltaX)
            newHeight = Math.max(120, startHeight + deltaY)
            newX = startPosition.x + (startWidth - newWidth)
            break
            
          case 'bottom-right':
            newWidth = Math.max(200, startWidth + deltaX)
            newHeight = Math.max(120, startHeight + deltaY)
            break
        }
        
        // Update node data
        updateNodeData(data.id, { 
          width: newWidth, 
          height: newHeight 
        })
        
        // Update position if changed
        if (newX !== startPosition.x || newY !== startPosition.y) {
          setNodes((nds: any) => nds.map((node: any) => 
            node.id === data.id 
              ? { ...node, position: { x: newX, y: newY } }
              : node
          ))
        }

        // Call custom resize handler if provided
        onResize?.(newWidth, newHeight)
      })
    }
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.stopPropagation()
      upEvent.preventDefault()
      
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [data.width, data.height, data.id, updateNodeData, getNodes, setNodes, onResize])

  const StatusIcon = statusIcons[data.status || 'inactive']

  const nodeStyle = {
    width: data.isMinimized ? 'auto' : (data.width || 480),
    height: data.isMinimized ? 'auto' : (data.height || 270),
    minWidth: data.isMinimized ? '120px' : '200px',
    minHeight: data.isMinimized ? '40px' : '120px',
    borderColor: data.stroke || 'rgba(209, 213, 219, 0.5)',
    backgroundColor: data.fill || 'rgba(249, 250, 251, 0.7)',
    ...style
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          ref={nodeRef}
          className={`
            relative border bg-white/70 shadow-lg transition-all duration-200
            backdrop-blur-[2px] backdrop-saturate-150 rounded-lg
            ${selected ? 'ring-2 ring-blue-500/50 ring-offset-1' : ''}
            ${data.isMinimized ? 'hover:shadow-md' : 'hover:shadow-xl'}
            ${className}
          `}
          style={nodeStyle}
        >
          {/* React Flow Connection Handles */}
          {showHandles && (
            <>
              <Handle
                type="target"
                position={Position.Top}
                className="w-2 h-2 !bg-blue-500/70 border-2 border-white/90 hover:!bg-blue-600 transition-colors"
                style={{ top: -4 }}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                className="w-2 h-2 !bg-blue-500/70 border-2 border-white/90 hover:!bg-blue-600 transition-colors"
                style={{ bottom: -4 }}
              />
              <Handle
                type="target"
                position={Position.Left}
                className="w-2 h-2 !bg-blue-500/70 border-2 border-white/90 hover:!bg-blue-600 transition-colors"
                style={{ left: -4 }}
              />
              <Handle
                type="source"
                position={Position.Right}
                className="w-2 h-2 !bg-blue-500/70 border-2 border-white/90 hover:!bg-blue-600 transition-colors"
                style={{ right: -4 }}
              />
            </>
          )}

          {/* Node Header */}
          {showHeader && (
            <div className="flex items-center justify-between p-3 border-b border-gray-200/50 bg-gradient-to-r from-white/50 to-gray-50/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <StatusIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                
                {isEditing ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleTitleSave}
                    className="h-6 text-sm font-medium"
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                    onClick={handleTitleEdit}
                  >
                    {data.title}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 ${statusColors[data.status || 'inactive']}`}
                >
                  {statusLabels[data.status || 'inactive']}
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleNodeMinimized(data.id)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  {data.isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          )}

          {/* Node Content */}
          <div className={showHeader ? "p-3" : "p-0"}>
            {children}
          </div>

          {/* Resize Handles */}
          {selected && !data.isMinimized && showResizeHandles && (
            <>
              <div
                className="nodrag absolute -top-1 -left-1 w-3 h-3 bg-blue-500/70 border-2 border-white/90 rounded-full cursor-nw-resize hover:bg-blue-600 z-50 transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'top-left')}
                onDragStart={(e) => e.preventDefault()}
              />
              <div
                className="nodrag absolute -top-1 -right-1 w-3 h-3 bg-blue-500/70 border-2 border-white/90 rounded-full cursor-ne-resize hover:bg-blue-600 z-50 transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'top-right')}
                onDragStart={(e) => e.preventDefault()}
              />
              <div
                className="nodrag absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500/70 border-2 border-white/90 rounded-full cursor-sw-resize hover:bg-blue-600 z-50 transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
                onDragStart={(e) => e.preventDefault()}
              />
              <div
                className="nodrag absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500/70 border-2 border-white/90 rounded-full cursor-se-resize hover:bg-blue-600 z-50 transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                onDragStart={(e) => e.preventDefault()}
              />
            </>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={() => copyNode(data.id)}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => console.log('Add comment to node:', data.id)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Add Comment
        </ContextMenuItem>
        <ContextMenuItem onClick={() => deleteNode(data.id)} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// Legacy NodeWrapper for backward compatibility
export const NodeWrapper = BaseNode

// Export common utilities
export { 
  Edit3, 
  Copy, 
  Trash2, 
  MessageSquare, 
  Activity, 
  CheckCircle, 
  Circle,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock
}

export { Badge } from '@/components/ui/badge'
export { Button } from '@/components/ui/button'
export { Input } from '@/components/ui/input'
export { Textarea } from '@/components/ui/textarea' 