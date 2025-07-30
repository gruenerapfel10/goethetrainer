import { useState, useCallback, useEffect } from 'react'
import { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Node, 
  Edge, 
  Connection 
} from 'reactflow'
import { 
  CanvasState, 
  Layer, 
  Note, 
  Task, 
  Comment, 
  Template, 
  NotionBlock, 
  NodeStatus,
  NodeData,
  BaseNodeData,
  ShapeNodeData,
  TextNodeData,
  NoteNodeData,
  TaskNodeData,
  NodeProperty,
   NodePropertyGroup,
  SidebarItem
} from '../types'
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_LAYERS, SHAPE_DEFAULTS } from '../constants'

// Storage key for canvas state
const CANVAS_STORAGE_KEY = 'eraser-canvas-state'

// Type for our enhanced nodes that work with React Flow
type EnhancedNode = Node<NodeData>

// Storage interface
interface StoredCanvasState {
  nodes: Node<NodeData>[]
  edges: Edge[]
  canvasState: CanvasState
  notes: Note[]
  tasks: Task[]
}

// Storage utilities
const saveCanvasState = (state: StoredCanvasState) => {
  // Only run on client-side
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save canvas state:', error)
  }
}

const loadCanvasState = (): StoredCanvasState | null => {
  // Only run on client-side
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects
      parsed.nodes = parsed.nodes?.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          createdAt: new Date(node.data.createdAt),
          updatedAt: new Date(node.data.updatedAt),
          dueDate: node.data.dueDate ? new Date(node.data.dueDate) : undefined
        }
      })) || []
      parsed.notes = parsed.notes?.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      })) || []
      parsed.tasks = parsed.tasks?.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined
      })) || []
      return parsed
    }
  } catch (error) {
    console.error('Failed to load canvas state:', error)
  }
  return null
}

interface UseCanvasStateProps {
  currentUser?: {
    id: string
    name: string
    image?: string
  }
}

export const useCanvasState = (props: UseCanvasStateProps = {}) => {
  // Load initial state from storage (only on client-side)
  const [initialState, setInitialState] = useState<StoredCanvasState | null>(null)
  
  // Load state on client-side only
  useEffect(() => {
    const state = loadCanvasState()
    setInitialState(state)
  }, [])

  // Canvas UI state
  const [canvasState, setCanvasState] = useState<CanvasState>(initialState?.canvasState || {
    selectedTool: 'cursor',
    showAIPrompt: false,
    aiPrompt: '',
    showDrawingSidebar: false,
    activeSidebarItem: 'layers',
    zoomLevel: 100,
    showTasksPanel: false,
    showCommentsPanel: false,
    selectedNodeId: null,
  })

  // Layers state
  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS)

  // Notion-like features state
  const [notes, setNotes] = useState<Note[]>(initialState?.notes || [])
  const [tasks, setTasks] = useState<Task[]>(initialState?.tasks || [])
  const [comments, setComments] = useState<Comment[]>([])

  // React Flow state with enhanced nodes
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialState?.nodes || INITIAL_NODES as Node<NodeData>[])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState?.edges || INITIAL_EDGES)

  // Selected node state for unified property panel
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null)

  // Update selected node when selection changes
  useEffect(() => {
    if (canvasState.selectedNodeId) {
      const node = nodes.find(n => n.id === canvasState.selectedNodeId)
      setSelectedNode(node || null)
    } else {
      setSelectedNode(null)
    }
  }, [canvasState.selectedNodeId, nodes])

  // Auto-save canvas state with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const stateToSave: StoredCanvasState = {
        nodes,
        edges,
        canvasState,
        notes,
        tasks
      }
      saveCanvasState(stateToSave)
    }, 1000) // Save after 1 second of no changes

    return () => clearTimeout(timeoutId)
  }, [nodes, edges, canvasState, notes, tasks])

  // Update canvas state
  const updateCanvasState = useCallback((updates: Partial<CanvasState>) => {
    setCanvasState(prev => ({ ...prev, ...updates }))
  }, [])

  // React Flow handlers with selection tracking
  const handleNodesChange = useCallback((changes: any[]) => {
    // Track selection changes
    changes.forEach(change => {
      if (change.type === 'select') {
        const updates: Partial<CanvasState> = { 
          selectedNodeId: change.selected ? change.id : null 
        }
        
        // If a node is selected and layers panel is not open, open it
        if (change.selected && canvasState.activeSidebarItem !== 'layers') {
          updates.activeSidebarItem = 'layers'
        }
        
        updateCanvasState(updates)
      }
    })
    onNodesChange(changes)
  }, [onNodesChange, updateCanvasState, canvasState.activeSidebarItem])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Unified node creation function
  const createBaseNodeData = (type: NodeData['type'], overrides: Partial<BaseNodeData> = {}): BaseNodeData => {
    const now = new Date()
    const currentUser = props.currentUser || { id: 'anonymous', name: 'Anonymous' }
    
    return {
      id: `${type}_${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: '',
      width: 400,
      height: 225,
      fill: '#ffffff',
      stroke: '#3b82f6',
      fontSize: '14px',
      color: '#000000',
      status: 'inactive' as NodeStatus,
      isMinimized: true,
      isSelected: false,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerAvatar: currentUser.image,
      createdAt: now,
      updatedAt: now,
      tags: [],
      ...overrides
    }
  }

  // Create specific node types
  const createShapeNode = useCallback((shapeType: 'rectangle' | 'circle' | 'triangle'): ShapeNodeData => {
    const defaults = SHAPE_DEFAULTS[shapeType] || {}
    return {
      ...createBaseNodeData(shapeType),
      ...defaults,
      borderRadius: shapeType === 'rectangle' ? 12 : 0,
      opacity: 1,
    } as ShapeNodeData
  }, [])

  const createTextNode = useCallback((content: string = 'Click to edit'): TextNodeData => {
    return {
      ...createBaseNodeData('text'),
      content,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'normal',
      textAlign: 'left',
      isEditing: false,
      width: 480,
      height: 270,
    } as TextNodeData
  }, [])

  const createNoteNode = useCallback((note: Note): NoteNodeData => {
    return {
      ...createBaseNodeData('note'),
      noteId: note.id,
      title: note.title,
      blocks: note.blocks,
      backgroundColor: '#fef3c7',
      stroke: '#f59e0b',
      fill: '#fef3c7',
      expandedWidth: 640,
      expandedHeight: 360,
      showMarkdown: false,
      width: 480,
      height: 270,
    } as NoteNodeData
  }, [])

  const createTaskNode = useCallback((task: Task): TaskNodeData => {
    return {
      ...createBaseNodeData('task'),
      taskId: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee,
      backgroundColor: '#dbeafe',
      stroke: '#3b82f6',
      fill: '#dbeafe',
      subtasks: [],
      width: 480,
      height: 270,
    } as TaskNodeData
  }, [])

  // Add nodes to canvas
  const addNode = useCallback((nodeData: NodeData, position?: { x: number; y: number }) => {
    const newNode: Node<NodeData> = {
      id: nodeData.id,
      type: nodeData.type,
      data: nodeData,
      position: position || { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
    }
    
    setNodes((nds) => [...nds, newNode])
    updateCanvasState({ selectedNodeId: newNode.id })
    return newNode
  }, [setNodes, updateCanvasState])

  // Unified node update function with live refresh
  const updateNodeData = useCallback((nodeId: string, updates: Partial<NodeData>) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === nodeId) {
        const updatedData = {
          ...node.data,
          ...updates,
          updatedAt: new Date()
        } as NodeData
        
        // If this is a note node, also update the notes array
        if (updatedData.type === 'note' && 'blocks' in updates) {
          const noteNode = updatedData as NoteNodeData
          setNotes(prev => prev.map(note => 
            note.id === noteNode.noteId
              ? { ...note, blocks: noteNode.blocks, updatedAt: new Date() }
              : note
          ))
        }
        
        // If this is a task node, also update the tasks array
        if (updatedData.type === 'task') {
          const taskNode = updatedData as TaskNodeData
          setTasks(prev => prev.map(task => 
            task.id === taskNode.taskId
              ? { 
                  ...task, 
                  title: taskNode.title,
                  description: taskNode.description || '',
                  completed: taskNode.completed,
                  priority: (taskNode.priority === 'urgent' ? 'high' : taskNode.priority) || 'medium',
                  dueDate: taskNode.dueDate,
                  assignee: taskNode.assignee,
                  updatedAt: new Date() 
                }
              : task
          ))
        }
        
        return { ...node, data: updatedData }
      }
      return node
    }))
  }, [setNodes, setNotes, setTasks])

  // Toggle node minimized/expanded state
  const toggleNodeMinimized = useCallback((nodeId: string) => {
    updateNodeData(nodeId, { 
      isMinimized: !nodes.find(n => n.id === nodeId)?.data.isMinimized 
    })
  }, [updateNodeData, nodes])

  // Update node status
  const updateNodeStatus = useCallback((nodeId: string, status: NodeStatus) => {
    updateNodeData(nodeId, { status })
  }, [updateNodeData])

  // Copy node
  const copyNode = useCallback((nodeId: string) => {
    const nodeToCopy = nodes.find(node => node.id === nodeId)
    if (!nodeToCopy) return

    const copiedData = {
      ...nodeToCopy.data,
      id: `${nodeToCopy.data.type}_copy_${Date.now()}`,
      title: `${nodeToCopy.data.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    addNode(copiedData, {
      x: nodeToCopy.position.x + 50,
      y: nodeToCopy.position.y + 50
    })
  }, [nodes, addNode])

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(node => node.id !== nodeId))
    setEdges((eds) => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId))
    
    if (canvasState.selectedNodeId === nodeId) {
      updateCanvasState({ selectedNodeId: null })
    }
  }, [setNodes, setEdges, canvasState.selectedNodeId, updateCanvasState])

  // Helper functions for adding specific node types
  const addDefaultNode = useCallback(() => {
    const nodeData = createShapeNode('rectangle')
    addNode(nodeData)
  }, [createShapeNode, addNode])

  const addShapeNode = useCallback((shapeType: string) => {
    const nodeData = createShapeNode(shapeType as 'rectangle' | 'circle' | 'triangle')
    addNode(nodeData)
    updateCanvasState({ 
      showDrawingSidebar: false, 
      selectedTool: 'cursor',
      activeSidebarItem: null 
    })
  }, [createShapeNode, addNode, updateCanvasState])

  const addTextNode = useCallback((content?: string) => {
    const nodeData = createTextNode(content)
    addNode(nodeData)
  }, [createTextNode, addNode])

  const addNoteAsNode = useCallback((note: Note, position?: { x: number; y: number }) => {
    const nodeData = createNoteNode(note)
    addNode(nodeData, position)
  }, [createNoteNode, addNode])

  const addTaskAsNode = useCallback((task: Task, position?: { x: number; y: number }) => {
    const nodeData = createTaskNode(task)
    addNode(nodeData, position)
  }, [createTaskNode, addNode])

  // Get node properties for unified property panel
  const getNodeProperties = useCallback((node: Node<NodeData>): NodePropertyGroup[] => {
    if (!node) return []

    const commonProperties: NodePropertyGroup = {
      title: 'General',
      properties: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          value: node.data.title
        },
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          value: node.data.description || ''
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          value: node.data.status || 'inactive',
          options: [
            { label: 'Inactive', value: 'inactive' },
            { label: 'Working', value: 'working' },
            { label: 'Complete', value: 'complete' }
          ]
        }
      ]
    }

    const visualProperties: NodePropertyGroup = {
      title: 'Visual',
      properties: [
        {
          key: 'width',
          label: 'Width',
          type: 'number',
          value: node.data.width || 160,
          min: 50,
          max: 800
        },
        {
          key: 'height',
          label: 'Height',
          type: 'number',
          value: node.data.height || 100,
          min: 30,
          max: 600
        },
        {
          key: 'fill',
          label: 'Background Color',
          type: 'color',
          value: node.data.fill || '#ffffff'
        },
        {
          key: 'stroke',
          label: 'Border Color',
          type: 'color',
          value: node.data.stroke || '#3b82f6'
        }
      ]
    }

    const groups = [commonProperties, visualProperties]

    // Add type-specific properties
    switch (node.data.type) {
      case 'text':
        const textData = node.data as TextNodeData
        groups.push({
          title: 'Text Properties',
          properties: [
            {
              key: 'content',
              label: 'Content',
              type: 'textarea',
              value: textData.content
            },
            {
              key: 'fontSize',
              label: 'Font Size',
              type: 'text',
              value: textData.fontSize || '14px'
            },
            {
              key: 'color',
              label: 'Text Color',
              type: 'color',
              value: textData.color || '#000000'
            },
            {
              key: 'textAlign',
              label: 'Text Alignment',
              type: 'select',
              value: textData.textAlign || 'left',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
              ]
            }
          ]
        })
        break

      case 'note':
        const noteData = node.data as NoteNodeData
        groups.push({
          title: 'Note Properties',
          properties: [
            {
              key: 'showMarkdown',
              label: 'Show as Markdown',
              type: 'boolean',
              value: noteData.showMarkdown || false
            },
            {
              key: 'backgroundColor',
              label: 'Background Color',
              type: 'color',
              value: noteData.backgroundColor || '#fef3c7'
            }
          ]
        })
        break

      case 'task':
        const taskData = node.data as TaskNodeData
        groups.push({
          title: 'Task Properties',
          properties: [
            {
              key: 'completed',
              label: 'Completed',
              type: 'boolean',
              value: taskData.completed
            },
            {
              key: 'priority',
              label: 'Priority',
              type: 'select',
              value: taskData.priority,
              options: [
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' }
              ]
            },
            {
              key: 'dueDate',
              label: 'Due Date',
              type: 'date',
              value: taskData.dueDate
            },
            {
              key: 'assignee',
              label: 'Assignee',
              type: 'text',
              value: taskData.assignee || ''
            }
          ]
        })
        break
    }

    return groups
  }, [])

  // Generate AI diagram
  const handleAIGenerate = useCallback(() => {
    if (!canvasState.aiPrompt.trim()) return
    
    const aiNodes: Node<NodeData>[] = [
      {
        id: 'ai-user',
        type: 'rectangle',
        data: createShapeNode('rectangle'),
        position: { x: 100, y: 100 }
      },
      {
        id: 'ai-api',
        type: 'rectangle',
        data: createShapeNode('rectangle'),
        position: { x: 300, y: 100 }
      },
      {
        id: 'ai-db',
        type: 'rectangle',
        data: createShapeNode('rectangle'),
        position: { x: 500, y: 100 }
      }
    ]
    
    setNodes(aiNodes)
    setEdges([
      { id: 'ai-e1-2', source: 'ai-user', target: 'ai-api', type: 'default' },
      { id: 'ai-e2-3', source: 'ai-api', target: 'ai-db', type: 'default' }
    ])
    
    // Update node data after they're added
    setTimeout(() => {
      updateNodeData('ai-user', { title: 'User', description: 'End user of the system', status: 'working' })
      updateNodeData('ai-api', { title: 'API Gateway', description: 'Handles all incoming requests', status: 'working' })
      updateNodeData('ai-db', { title: 'Database', description: 'Stores application data', status: 'complete' })
    }, 100)
    
    updateCanvasState({ aiPrompt: '', showAIPrompt: false })
  }, [canvasState.aiPrompt, createShapeNode, setNodes, setEdges, updateCanvasState, updateNodeData])

  // Handle sidebar item selection
  const handleSidebarItemClick = useCallback((item: SidebarItem | null) => {
    if (item === null) {
      updateCanvasState({
        showDrawingSidebar: false,
        showTasksPanel: false,
        showCommentsPanel: false,
        activeSidebarItem: null
      })
      return
    }

    const panelToggles: Record<SidebarItem, () => void> = {
      tasks: () => updateCanvasState({ 
        showTasksPanel: !canvasState.showTasksPanel,
        showCommentsPanel: false,
        showDrawingSidebar: false,
        activeSidebarItem: canvasState.showTasksPanel ? null : 'tasks'
      }),
      notes: () => updateCanvasState({
        showTasksPanel: false,
        showCommentsPanel: false,
        showDrawingSidebar: false,
        activeSidebarItem: 'notes'
      }),
      templates: () => updateCanvasState({ 
        showTasksPanel: false,
        showCommentsPanel: false,
        showDrawingSidebar: false,
        activeSidebarItem: canvasState.activeSidebarItem === 'templates' ? null : 'templates'
      }),
      palette: () => updateCanvasState({
        showDrawingSidebar: !canvasState.showDrawingSidebar,
        showTasksPanel: false,
        showCommentsPanel: false,
        activeSidebarItem: canvasState.showDrawingSidebar ? null : 'palette'
      }),
      layers: () => updateCanvasState({
        showDrawingSidebar: false,
        showTasksPanel: false,
        showCommentsPanel: false,
        activeSidebarItem: 'layers'
      }),
      ai: () => updateCanvasState({
        showDrawingSidebar: false,
        showTasksPanel: false,
        showCommentsPanel: false,
        activeSidebarItem: 'ai'
      }),
      cursor: () => updateCanvasState({
        selectedTool: 'cursor',
        activeSidebarItem: 'cursor'
      }),
      workspace: () => updateCanvasState({
        showDrawingSidebar: false,
        showTasksPanel: false,
        showCommentsPanel: false,
        activeSidebarItem: 'workspace'
      })
    }

    const toggleAction = panelToggles[item]
    if (toggleAction) {
      toggleAction()
      return
    }
    
    // Default behavior
    updateCanvasState({
      selectedTool: item,
      activeSidebarItem: item
    })
  }, [canvasState, updateCanvasState])

  // Zoom controls
  const zoomIn = useCallback(() => {
    updateCanvasState({ 
      zoomLevel: Math.min(200, canvasState.zoomLevel + 25) 
    })
  }, [canvasState.zoomLevel, updateCanvasState])

  const zoomOut = useCallback(() => {
    updateCanvasState({ 
      zoomLevel: Math.max(25, canvasState.zoomLevel - 25) 
    })
  }, [canvasState.zoomLevel, updateCanvasState])

  // Note management
  const addNote = useCallback(() => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: 'Untitled Note',
      blocks: [{
        id: `block_${Date.now()}`,
        type: 'paragraph',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
    setNotes(prev => [...prev, newNote])
    return newNote
  }, [])

  const updateNote = useCallback((noteId: string, blocks: NotionBlock[]) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, blocks, updatedAt: new Date() }
        : note
    ))
    
    // Also update any note nodes on the canvas
    setNodes(nds => nds.map(node => {
      if (node.data.type === 'note' && (node.data as NoteNodeData).noteId === noteId) {
        return {
          ...node,
          data: {
            ...node.data,
            blocks,
            updatedAt: new Date()
          }
        }
      }
      return node
    }))
  }, [setNotes, setNodes])

  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId))
    
    // Also remove any note nodes from canvas
    setNodes(nds => nds.filter(node => 
      !(node.data.type === 'note' && (node.data as NoteNodeData).noteId === noteId)
    ))
  }, [setNotes, setNodes])

  // Task management
  const addTask = useCallback(() => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: 'New Task',
      description: '',
      completed: false,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [])

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date() }
        : task
    ))
    
    // Also update any task nodes on the canvas
    setNodes(nds => nds.map(node => {
      if (node.data.type === 'task' && (node.data as TaskNodeData).taskId === taskId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...updates,
            updatedAt: new Date()
          }
        }
      }
      return node
    }))
  }, [setTasks, setNodes])

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
    
    // Also remove any task nodes from canvas
    setNodes(nds => nds.filter(node => 
      !(node.data.type === 'task' && (node.data as TaskNodeData).taskId === taskId)
    ))
  }, [setTasks, setNodes])

  // Template management
  const applyTemplate = useCallback((template: Template) => {
    const nodeIdMap = new Map<string, string>()
    
    const newNodes = template.nodes.map(node => {
      const newId = `template_node_${Date.now()}_${Math.random()}`
      nodeIdMap.set(node.id, newId)
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + Math.random() * 100,
          y: node.position.y + Math.random() * 100
        }
      }
    })

    const newEdges = template.edges.map(edge => ({
      ...edge,
      id: `template_edge_${Date.now()}_${Math.random()}`,
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target
    }))

    setNodes(newNodes)
    setEdges(newEdges)
  }, [setNodes, setEdges])

  // Keyboard shortcuts
  const selectAllNodes = useCallback(() => {
    setNodes(nodes => 
      nodes.map(node => ({
        ...node,
        selected: true
      }))
    )
  }, [setNodes])

  const deleteSelectedNodes = useCallback(() => {
    setNodes(nodes => {
      const selectedNodes = nodes.filter(node => node.selected)
      const selectedNodeIds = selectedNodes.map(node => node.id)
      
      if (selectedNodeIds.length > 0) {
        // Also remove connected edges
        setEdges(edges => edges.filter(edge => 
          !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
        ))
        
        return nodes.filter(node => !node.selected)
      }
      return nodes
    })
  }, [setNodes, setEdges])

  const setSelectMode = useCallback(() => {
    updateCanvasState({ 
      activeSidebarItem: 'cursor',
      showDrawingSidebar: false,
      showTasksPanel: false,
      showCommentsPanel: false
    })
  }, [updateCanvasState])

  return {
    // State
    canvasState,
    layers,
    nodes,
    edges,
    notes,
    tasks,
    comments,
    selectedNode,
    
    // State updaters
    updateCanvasState,
    setLayers,
    
    // React Flow handlers
    onNodesChange: handleNodesChange,
    onEdgesChange,
    onConnect,
    
    // Unified node management
    addNode,
    updateNodeData,
    toggleNodeMinimized,
    updateNodeStatus,
    copyNode,
    deleteNode,
    getNodeProperties,
    
    // Node creation helpers
    addDefaultNode,
    addShapeNode,
    addTextNode,
    addNoteAsNode,
    addTaskAsNode,
    
    // Legacy functions
    handleAIGenerate,
    handleSidebarItemClick,
    zoomIn,
    zoomOut,
    
    // Keyboard shortcuts
    selectAllNodes,
    deleteSelectedNodes,
    setSelectMode,
    
    // Notion-like features
    addNote,
    updateNote,
    deleteNote,
    addTask,
    updateTask,
    deleteTask,
    applyTemplate,
  }
} 