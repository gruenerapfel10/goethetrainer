import { 
  MousePointer, Square, Circle, Triangle, Type, 
  Settings, Layers, Palette, Plus, Workflow,
  FileText, CheckSquare, MessageCircle, Layout
} from 'lucide-react'
import { Node, Edge } from 'reactflow'
import { Tool, Layer, Template as TemplateType } from './types'

// Primary sidebar tools
export const PRIMARY_TOOLS: Tool[] = [
  { id: 'cursor', icon: MousePointer, label: 'Cursor / Select' },
  { id: 'node', icon: Plus, label: 'Add Node' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'comments', icon: MessageCircle, label: 'Comments' },
  { id: 'templates', icon: Layout, label: 'Templates' },
  { id: 'layers', icon: Layers, label: 'Layers' },
  { id: 'palette', icon: Palette, label: 'Drawing Tools' },
  { id: 'workflow', icon: Workflow, label: 'Workflow' },
]

// Drawing tools for secondary sidebar
export const DRAWING_TOOLS: Tool[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'text', icon: Type, label: 'Text' },
]

// Color palette
export const COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
  '#000000', // black
]

// Initial layers
export const INITIAL_LAYERS: Layer[] = [
  { id: '1', name: 'Background', visible: true, locked: false },
  { id: '2', name: 'Main Content', visible: true, locked: false },
  { id: '3', name: 'Annotations', visible: true, locked: false },
]

// Start with clean canvas - users can create nodes through our unified system
export const INITIAL_NODES: Node[] = []

export const INITIAL_EDGES: Edge[] = []

// Shape defaults
export const SHAPE_DEFAULTS = {
  rectangle: {
    width: 480,
    height: 270,
    fill: 'rgba(249, 250, 251, 0.7)',
    stroke: 'rgba(209, 213, 219, 0.5)'
  },
  circle: {
    width: 270,
    height: 270,
    fill: 'rgba(249, 250, 251, 0.7)',
    stroke: 'rgba(209, 213, 219, 0.5)'
  },
  triangle: {
    width: 270,
    height: 270,
    fill: 'rgba(249, 250, 251, 0.7)',
    stroke: 'rgba(209, 213, 219, 0.5)'
  },
  text: {
    width: 480,
    height: 270,
    fill: 'transparent',
    stroke: 'rgba(209, 213, 219, 0.3)',
    fontSize: '16px',
    color: '#374151'
  }
}

// Notion-like templates (temporarily disabled - will update to new node structure)
export const DIAGRAM_TEMPLATES: TemplateType[] = [
  // Will re-implement with standardized node structure
]

// Task priorities with colors
export const TASK_PRIORITIES = {
  low: { label: 'Low', color: '#10b981', bgColor: '#d1fae5' },
  medium: { label: 'Medium', color: '#f59e0b', bgColor: '#fef3c7' },
  high: { label: 'High', color: '#ef4444', bgColor: '#fee2e2' }
} 