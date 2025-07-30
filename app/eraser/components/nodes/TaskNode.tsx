import React, { useState, useEffect, useCallback } from 'react'
import { NodeProps } from 'reactflow'
import { TaskNodeData, NodeStatus } from '../../types'
import { BaseNode, Button, Badge, CheckSquare, Square, AlertTriangle, Clock, Input } from './shared'
import { useCanvasContext } from '../canvas-context'

export const TaskNode: React.FC<NodeProps<TaskNodeData>> = ({ data, selected, id }) => {
  const { updateNodeData } = useCanvasContext()
  const [timeWorked, setTimeWorked] = useState(data.timeWorked || 0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [tempTitle, setTempTitle] = useState(data.title || '')
  const [tempDescription, setTempDescription] = useState(data.description || '')
  const [newSubtask, setNewSubtask] = useState('')
  const [showSubtasks, setShowSubtasks] = useState(true)

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeWorked((prev: number) => {
          const newTime = prev + 1
          updateNodeData(data.id, { timeWorked: newTime })
          return newTime
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, updateNodeData, data.id])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleComplete = () => {
    const newCompleted = !data.completed
    const newStatus = newCompleted ? 'done' : 'todo'
    updateNodeData(data.id, { 
      completed: newCompleted, 
      status: newStatus,
      completedAt: newCompleted ? new Date() : undefined
    })
  }

  const handleStatusChange = (newStatus: string) => {
    updateNodeData(data.id, { 
      status: newStatus as NodeStatus,
      completed: newStatus === 'done',
      completedAt: newStatus === 'done' ? new Date() : undefined
    })
  }

  const handlePriorityChange = (priority: string) => {
    updateNodeData(data.id, { priority })
  }

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    
    const subtask = {
      id: `subtask_${Date.now()}`,
      title: newSubtask.trim(),
      completed: false,
      createdAt: new Date()
    }
    
    const updatedSubtasks = [...(data.subtasks || []), subtask]
    updateNodeData(data.id, { subtasks: updatedSubtasks })
    setNewSubtask('')
  }

  const handleSubtaskToggle = (subtaskId: string) => {
    const updatedSubtasks = data.subtasks?.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    updateNodeData(data.id, { subtasks: updatedSubtasks })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = data.subtasks?.filter(s => s.id !== subtaskId)
    updateNodeData(data.id, { subtasks: updatedSubtasks })
  }

  const saveTitle = () => {
    updateNodeData(data.id, { title: tempTitle })
    setIsEditingTitle(false)
  }

  const saveDescription = () => {
    updateNodeData(data.id, { description: tempDescription })
    setIsEditingDescription(false)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      todo: { 
        color: 'bg-gray-100 text-gray-700 border-gray-300', 
        icon: '⭕', 
        label: 'To Do',
        glow: ''
      },
      'in-progress': { 
        color: 'bg-blue-100 text-blue-700 border-blue-300', 
        icon: '🔄', 
        label: 'In Progress',
        glow: 'ring-2 ring-blue-300 ring-opacity-50 animate-pulse'
      },
      working: { 
        color: 'bg-green-100 text-green-700 border-green-300', 
        icon: '⚡', 
        label: 'Working On',
        glow: 'ring-2 ring-green-400 ring-opacity-75 shadow-lg shadow-green-200 animate-pulse'
      },
      review: { 
        color: 'bg-purple-100 text-purple-700 border-purple-300', 
        icon: '👀', 
        label: 'Review',
        glow: ''
      },
      done: { 
        color: 'bg-green-100 text-green-700 border-green-300', 
        icon: '✅', 
        label: 'Done',
        glow: ''
      },
      blocked: { 
        color: 'bg-red-100 text-red-700 border-red-300', 
        icon: '🚫', 
        label: 'Blocked',
        glow: ''
      }
    }
    return configs[status as keyof typeof configs] || configs.todo
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'bg-green-100 text-green-700', icon: '🟢', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-700', icon: '🟠', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-700', icon: '🔴', label: 'Urgent' }
    }
    return configs[priority as keyof typeof configs] || configs.medium
  }

  const completedSubtasks = data.subtasks?.filter(s => s.completed).length || 0
  const totalSubtasks = data.subtasks?.length || 0
  const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  const statusConfig = getStatusConfig(data.status || 'todo')
  const priorityConfig = getPriorityConfig(data.priority || 'medium')

  const isOverdue = data.dueDate && new Date(data.dueDate) < new Date() && !data.completed

  if (data.isMinimized) {
    return (
      <BaseNode 
        data={data} 
        selected={selected}
        showHeader={false}
        className={`task-node-minimized transition-all duration-200 ${statusConfig.glow}`}
        style={{ cursor: 'pointer' }}
      >
        <div 
          className="p-3"
          onClick={() => updateNodeData(data.id, { isMinimized: false })}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleComplete()
              }}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                data.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {data.completed && <span className="text-xs">✓</span>}
            </button>
            <span className={`text-sm font-medium truncate ${data.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {data.title || 'Untitled Task'}
            </span>
          </div>
          {totalSubtasks > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {completedSubtasks}/{totalSubtasks} subtasks
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
      className={`task-node-container group transition-all duration-300 ${statusConfig.glow}`}
      style={{
        background: data.completed 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(255, 255, 255, 0.9))'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(255, 255, 255, 0.9))',
        border: `1px solid ${data.completed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
      }}
    >
      <div className="h-full overflow-hidden">
        {/* Task Header */}
        <div className="task-header border-b border-gray-100 bg-gradient-to-r from-white/80 to-gray-50/50 p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={handleToggleComplete}
              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                data.completed
                  ? 'bg-green-500 border-green-500 text-white shadow-lg'
                  : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              {data.completed && (
                <span className="text-sm animate-bounce">✓</span>
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') {
                      setTempTitle(data.title || '')
                      setIsEditingTitle(false)
                    }
                  }}
                  className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:bg-white rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <h3 
                  className={`text-lg font-semibold cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${
                    data.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                  onClick={() => {
                    setTempTitle(data.title || '')
                    setIsEditingTitle(true)
                  }}
                >
                  {data.title || 'Click to add title...'}
                </h3>
              )}

              {isEditingDescription ? (
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  onBlur={saveDescription}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) return
                    if (e.key === 'Enter') saveDescription()
                    if (e.key === 'Escape') {
                      setTempDescription(data.description || '')
                      setIsEditingDescription(false)
                    }
                  }}
                  placeholder="Add a description..."
                  className="w-full mt-2 text-sm bg-transparent border-none outline-none focus:bg-white rounded px-2 py-1 resize-none"
                  rows={2}
                  autoFocus
                />
              ) : (
                <p 
                  className={`text-sm mt-1 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${
                    data.completed ? 'text-gray-400' : 'text-gray-600'
                  }`}
                  onClick={() => {
                    setTempDescription(data.description || '')
                    setIsEditingDescription(true)
                  }}
                >
                  {data.description || 'Click to add description...'}
                </p>
              )}
            </div>
          </div>

          {/* Status and Priority Controls */}
          <div className="flex flex-wrap gap-2 mt-3">
            <select
              value={data.status || 'todo'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-all hover:shadow-md ${statusConfig.color}`}
            >
              <option value="todo">⭕ To Do</option>
              <option value="in-progress">🔄 In Progress</option>
              <option value="working">⚡ Working On</option>
              <option value="review">👀 Review</option>
              <option value="done">✅ Done</option>
              <option value="blocked">🚫 Blocked</option>
            </select>

            <select
              value={data.priority || 'medium'}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-all hover:shadow-md ${priorityConfig.color}`}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>

            {isOverdue && (
              <Badge className="text-xs px-2 py-1 bg-red-100 text-red-700 border-red-200 animate-pulse">
                ⚠️ Overdue
              </Badge>
            )}
          </div>
        </div>

        {/* Task Content */}
        <div className="task-content p-4 space-y-4">
          {/* Time Tracking */}
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg p-3 border border-blue-100/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                ⏱️ Time Tracking
              </span>
              <Button
                variant={isTimerRunning ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`h-7 px-3 text-xs transition-all duration-200 ${
                  isTimerRunning ? 'animate-pulse shadow-lg' : 'hover:shadow-md'
                }`}
              >
                {isTimerRunning ? '⏹️ Stop' : '▶️ Start'}
              </Button>
            </div>
            <div className="text-xl font-mono text-center bg-white/80 rounded py-2 shadow-sm">
              {formatTime(timeWorked)}
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                📋 Subtasks ({completedSubtasks}/{totalSubtasks})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="h-6 w-6 p-0"
              >
                {showSubtasks ? '🔽' : '▶️'}
              </Button>
            </div>

            {/* Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {showSubtasks && (
              <div className="space-y-2">
                {/* Add new subtask */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask()
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubtask}
                    className="h-7 px-2 text-xs"
                    disabled={!newSubtask.trim()}
                  >
                    ➕
                  </Button>
                </div>

                {/* Subtask list */}
                {data.subtasks?.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => handleSubtaskToggle(subtask.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                        subtask.completed 
                          ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {subtask.completed && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`flex-1 text-xs transition-all ${
                      subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'
                    }`}>
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 text-red-500 hover:text-red-700 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Footer */}
        <div className="task-footer border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>Created: {new Date(data.createdAt || Date.now()).toLocaleDateString()}</span>
              {data.completedAt && (
                <span>Completed: {new Date(data.completedAt).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {data.assignee && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  👤 {data.assignee}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </BaseNode>
  )
} 