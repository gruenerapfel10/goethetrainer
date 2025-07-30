import React, { useCallback, useState } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  Node,
  Edge,
  NodeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Panel
} from 'reactflow'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  FileText,
  CheckSquare,
  Type,
  Square,
  Circle,
  Triangle,
  Image,
  Link,
  Code,
  Table
} from 'lucide-react'
import { NodeData } from '../types'
import { CursorOverlay } from './cursor-overlay'

interface CanvasProps {
  nodes: Node<NodeData>[]
  edges: Edge[]
  nodeTypes: NodeTypes
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onAddShapeNode: (shapeType: string) => void
  onAddTextNode: () => void
  onAddNoteNode: () => void
  onAddTaskNode: () => void
  onAddImageNode?: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  remoteCursors?: Array<{
    userId: string
    userName: string
    userAvatar?: string
    x: number
    y: number
    lastUpdate: number
  }>
  onMouseMove?: (e: React.MouseEvent) => void
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddShapeNode,
  onAddTextNode,
  onAddNoteNode,
  onAddTaskNode,
  onAddImageNode,
  onZoomIn,
  onZoomOut,
  remoteCursors = [],
  onMouseMove,
}) => {
  const { fitView } = useReactFlow()
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
  }, [])

  const nodeCreationItems = [
    {
      id: 'text',
      icon: Type,
      label: 'Text',
      description: 'Add a text block',
      action: onAddTextNode,
      shortcut: 'T'
    },
    {
      id: 'note',
      icon: FileText,
      label: 'Note',
      description: 'Create a rich text note',
      action: onAddNoteNode,
      shortcut: 'N'
    },
    {
      id: 'task',
      icon: CheckSquare,
      label: 'Task',
      description: 'Add a task with completion tracking',
      action: onAddTaskNode,
      shortcut: 'K'
    },
    { separator: true },
    {
      id: 'rectangle',
      icon: Square,
      label: 'Rectangle',
      description: 'Basic rectangle shape',
      action: () => onAddShapeNode('rectangle'),
      shortcut: 'R'
    },
    {
      id: 'circle',
      icon: Circle,
      label: 'Circle',
      description: 'Basic circle shape',
      action: () => onAddShapeNode('circle'),
      shortcut: 'C'
    },
    {
      id: 'triangle',
      icon: Triangle,
      label: 'Triangle',
      description: 'Basic triangle shape',
      action: () => onAddShapeNode('triangle')
    },
    { separator: true },
    {
      id: 'image',
      icon: Image,
      label: 'Image',
      description: 'Upload or embed an image',
      action: () => onAddImageNode?.(),
      shortcut: 'I'
    },
    {
      id: 'link',
      icon: Link,
      label: 'Link',
      description: 'Embed a web link',
      action: () => console.log('Link coming soon'),
      disabled: true
    },
    {
      id: 'code',
      icon: Code,
      label: 'Code Block',
      description: 'Add a code snippet',
      action: () => console.log('Code block coming soon'),
      disabled: true
    },
    {
      id: 'table',
      icon: Table,
      label: 'Table',
      description: 'Insert a data table',
      action: () => console.log('Table coming soon'),
      disabled: true
    }
  ]

  return (
    <div className="flex-1 relative bg-gray-50 dark:bg-gray-900" onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={handlePaneContextMenu}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
        nodeOrigin={[0.5, 0.5]}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={2} 
          color="#d1d5db"
          className="opacity-70"
        />
        
        {/* Notion-like floating toolbar */}
        <Panel position="top-left" className="m-4">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            {/* Add Node Dropdown */}
            <DropdownMenu open={showNodeMenu} onOpenChange={setShowNodeMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-72 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg"
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1 mb-1">
                  Basic Blocks
                </div>
                {nodeCreationItems.map((item, index) => (
                  item.separator ? (
                    <DropdownMenuSeparator key={index} className="my-1" />
                  ) : (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => {
                        if (!item.disabled && item.action) {
                          item.action()
                          setShowNodeMenu(false)
                        }
                      }}
                      disabled={item.disabled}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors
                        ${item.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {item.icon && <item.icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                      {item.shortcut && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </div>
                      )}
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />

            {/* Zoom Controls */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onZoomOut}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onZoomIn}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fitView({ padding: 0.1 })}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Fit View"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </Panel>

        {/* Canvas Context Menu */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="absolute inset-0" />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onAddTextNode}>
              <Type className="w-4 h-4 mr-2" />
              Add Text
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddNoteNode}>
              <FileText className="w-4 h-4 mr-2" />
              Add Note
            </ContextMenuItem>
            <ContextMenuItem onClick={onAddTaskNode}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Add Task
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddShapeNode('rectangle')}>
              <Square className="w-4 h-4 mr-2" />
              Add Rectangle
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddShapeNode('circle')}>
              <Circle className="w-4 h-4 mr-2" />
              Add Circle
            </ContextMenuItem>
            <ContextMenuItem onClick={() => fitView({ padding: 0.1 })}>
              <Maximize className="w-4 h-4 mr-2" />
              Fit View
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Standard React Flow Controls */}
        <Controls 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        />
      </ReactFlow>
      
      {/* Remote cursors overlay */}
      <CursorOverlay remoteCursors={remoteCursors} />
    </div>
  )
} 