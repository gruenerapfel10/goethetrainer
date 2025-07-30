import React, { useState } from 'react'
import { Plus, Calendar, User, MoreHorizontal, CheckSquare2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Task } from '../types'
import { TASK_PRIORITIES } from '../constants'

interface TasksPanelProps {
  tasks: Task[]
  onAddTask: () => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (taskId: string) => void
}

export const TasksPanel: React.FC<TasksPanelProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask()
      setNewTaskTitle('')
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const isOverdue = (dueDate: Date) => {
    return new Date() > dueDate
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tasks</h3>
          <Button onClick={onAddTask} size="sm" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Add Task */}
        <div className="flex space-x-2 mb-4">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a task..."
            className="flex-1"
          />
          <Button onClick={handleAddTask} size="sm" disabled={!newTaskTitle.trim()}>
            Add
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          {(['all', 'pending', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                filter === filterType
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {filterType} ({
                filterType === 'all' ? tasks.length :
                filterType === 'pending' ? tasks.filter(t => !t.completed).length :
                tasks.filter(t => t.completed).length
              })
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <CheckSquare2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No {filter === 'all' ? '' : filter} tasks</p>
            {filter === 'all' && (
              <Button onClick={onAddTask} size="sm" className="mt-2">
                Create your first task
              </Button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-lg border ${
                task.completed
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600'
              } hover:shadow-sm transition-shadow`}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 flex-1">
                  <button
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
                  >
                    {task.completed && <CheckSquare2 className="w-3 h-3" />}
                  </button>
                  
                  <div className="flex-1">
                    <Input
                      value={task.title}
                      onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                      className={`border-none shadow-none p-0 font-medium ${
                        task.completed
                          ? 'line-through text-gray-500'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    />
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteTask(task.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Task Description */}
              {!task.completed && (
                <textarea
                  value={task.description}
                  onChange={(e) => onUpdateTask(task.id, { description: e.target.value })}
                  placeholder="Add description..."
                  className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none resize-none focus:outline-none"
                  rows={2}
                />
              )}

              {/* Task Metadata */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  {/* Priority */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: TASK_PRIORITIES[task.priority].bgColor,
                          color: TASK_PRIORITIES[task.priority].color,
                        }}
                      >
                        {TASK_PRIORITIES[task.priority].label}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {Object.entries(TASK_PRIORITIES).map(([key, value]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => onUpdateTask(task.id, { priority: key as Task['priority'] })}
                        >
                          <span
                            className="w-3 h-3 rounded mr-2"
                            style={{ backgroundColor: value.color }}
                          />
                          {value.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Assignee */}
                  {task.assignee && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{task.assignee}</span>
                    </div>
                  )}
                </div>

                {/* Due Date */}
                {task.dueDate && (
                  <div className={`flex items-center space-x-1 text-xs ${
                    !task.completed && isOverdue(task.dueDate)
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(task.dueDate)}</span>
                    {!task.completed && isOverdue(task.dueDate) && (
                      <Clock className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Completed: {tasks.filter(t => t.completed).length}</span>
            <span>Total: {tasks.length}</span>
          </div>
          {tasks.length > 0 && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 