import { Node, Edge } from 'reactflow'

export interface Tool {
  id: string
  icon: React.ComponentType<any>
  label: string
  action?: () => void
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

export interface CanvasState {
  selectedTool: string
  showAIPrompt: boolean
  aiPrompt: string
  showDrawingSidebar: boolean
  activeSidebarItem: SidebarItem | null
  zoomLevel: number
  showTasksPanel: boolean
  showCommentsPanel: boolean
  selectedNodeId: string | null
}

export type NodeStatus = 'inactive' | 'working' | 'complete' | 'todo' | 'in-progress' | 'review' | 'done' | 'blocked' | 'paused'
export type NodeType = 'rectangle' | 'circle' | 'triangle' | 'text' | 'note' | 'task' | 'image' | 'link'

// Base Node Interface - All nodes extend this
export interface BaseNodeData {
  // Core properties
  id: string
  type: NodeType
  title: string
  description?: string
  
  // Visual properties
  width?: number
  height?: number
  fill?: string
  stroke?: string
  fontSize?: string
  color?: string
  
  // State properties
  status?: NodeStatus
  isMinimized: boolean
  isSelected: boolean
  
  // Ownership and collaboration
  ownerId: string
  ownerName: string
  ownerAvatar?: string
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  
  // Type-specific data (will be extended by specific node types)
  [key: string]: any
}

// Shape Node Data
export interface ShapeNodeData extends BaseNodeData {
  type: 'rectangle' | 'circle' | 'triangle'
  borderRadius?: number
  opacity?: number
}

// Text Node Data
export interface TextNodeData extends BaseNodeData {
  type: 'text'
  content: string
  fontFamily?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
  isEditing?: boolean
}

// Note Node Data
export interface NoteNodeData extends BaseNodeData {
  type: 'note'
  noteId: string
  blocks: NotionBlock[]
  backgroundColor?: string
  expandedWidth?: number
  expandedHeight?: number
  showMarkdown?: boolean
}

// Task Node Data
export interface TaskNodeData extends BaseNodeData {
  type: 'task'
  taskId?: string
  completed: boolean
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  assignee?: string
  timeWorked?: number
  completedAt?: Date
  subtasks?: Array<{
    id: string
    title: string
    completed: boolean
    createdAt?: Date
  }>
}

// Image Node Data
export interface ImageNodeData extends BaseNodeData {
  type: 'image'
  src: string
  alt?: string
  aspectRatio?: number
}

// Link Node Data
export interface LinkNodeData extends BaseNodeData {
  type: 'link'
  url: string
  favicon?: string
  previewTitle?: string
  previewDescription?: string
  previewImage?: string
}

// Union type for all node data types
export type NodeData = ShapeNodeData | TextNodeData | NoteNodeData | TaskNodeData | ImageNodeData | LinkNodeData

// Enhanced Node interface that extends ReactFlow's Node
export interface EnhancedNode extends Omit<Node, 'data'> {
  data: NodeData
}

export interface EraserPageProps {
  // Future props for the main page component
}

// Notion-like features
export interface NotionBlock {
  id: string
  type: 'paragraph' | 'heading' | 'bullet' | 'todo' | 'code' | 'quote'
  content: string
  completed?: boolean
  level?: number
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  title: string
  blocks: NotionBlock[]
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  assignee?: string
  createdAt: Date
  updatedAt: Date
  projectId?: string
}

export interface Comment {
  id: string
  content: string
  author: string
  timestamp: Date
  resolved: boolean
  nodeId?: string
  position?: { x: number; y: number }
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  nodes: EnhancedNode[]
  edges: Edge[]
  thumbnail?: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  createdAt: Date
  tasks: Task[]
  notes: Note[]
}

// Context menu types
export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<any>
  action: () => void
  separator?: boolean
  disabled?: boolean
}

export interface ContextMenuData {
  type: 'node' | 'edge' | 'canvas' | 'note'
  nodeId?: string
  edgeId?: string
  position?: { x: number; y: number }
}

// Node property definitions for the unified property panel
export interface NodeProperty {
  key: string
  label: string
  type: 'text' | 'number' | 'color' | 'select' | 'boolean' | 'textarea' | 'date'
  value: any
  options?: Array<{ label: string; value: any }>
  min?: number
  max?: number
  step?: number
  readOnly?: boolean
}

export interface NodePropertyGroup {
  title: string
  properties: NodeProperty[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// Sidebar types
export type SidebarItem = 'layers' | 'notes' | 'tasks' | 'templates' | 'ai' | 'cursor' | 'palette' | 'workspace'; 