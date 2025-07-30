"use client"

import React, { useState, useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useSession } from 'next-auth/react'
import { useMyPresence, useOthers } from '@liveblocks/react'
import 'reactflow/dist/style.css'

// Components
import { Toolbar } from './components/toolbar'
import { PrimarySidebar } from './components/primary-sidebar'
import { DrawingSidebar } from './components/drawing-sidebar'
import { Canvas } from './components/canvas'
import { PropertiesSidebar } from './components/properties-sidebar'
import { TasksPanel } from './components/tasks-panel'
import { TemplatesPanel } from './components/templates-panel'
import { AIAssistantPanel } from './components/ai-assistant-panel'
import { CanvasProvider } from './components/canvas-context'
import { CursorOverlay } from './components/cursor-overlay'
import { WorkspacePanel } from './components/workspace-panel'
import { CollaborativeRoom } from './components/collaborative-room'

// Hooks and utilities
import { useCanvasState } from './hooks/useCanvasState'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { nodeTypes } from './components/custom-nodes'

export default function EraserPage() {
  const { data: session } = useSession()
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("default-workspace")

  // Fetch or create default workspace
  useEffect(() => {
    const initializeWorkspace = async () => {
      if (!session?.user?.id) return

      try {
        // Try to get existing workspaces
        const response = await fetch("/api/workspaces")
        if (response.ok) {
          const workspaces = await response.json()
          if (workspaces.length > 0) {
            setCurrentWorkspace(workspaces[0])
            setWorkspaceId(workspaces[0].id)
          } else {
            // Create default workspace
            const createResponse = await fetch("/api/workspaces", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "My Workspace",
                description: "Default workspace for collaboration",
              }),
            })
            
            if (createResponse.ok) {
              const newWorkspace = await createResponse.json()
              setCurrentWorkspace(newWorkspace)
              setWorkspaceId(newWorkspace.id)
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize workspace:", error)
        // Fallback to offline mode
        setWorkspaceId("offline-workspace")
      }
    }

    initializeWorkspace()
  }, [session?.user?.id])

  const {
    // State
    canvasState,
    layers,
    nodes,
    edges,
    tasks,
    selectedNode,
    
    // State updaters
    updateCanvasState,
    
    // React Flow handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    
    // Unified node management
    updateNodeData,
    toggleNodeMinimized,
    copyNode,
    deleteNode,
    getNodeProperties,
    addNode,
    
    // Node creation helpers
    addShapeNode,
    addTextNode,
    addNoteAsNode,
    addTaskAsNode,
    
    // Actions
    handleAIGenerate,
    handleSidebarItemClick,
    zoomIn,
    zoomOut,
    
    // Keyboard shortcuts
    selectAllNodes,
    deleteSelectedNodes,
    setSelectMode,
    
    // Task management
    addTask,
    updateTask,
    deleteTask,
    applyTemplate,
  } = useCanvasState({
    currentUser: session?.user ? {
      id: session.user.id,
      name: session.user.name || 'Anonymous',
      image: session.user.image || undefined
    } : undefined
  })

  // Liveblocks collaborative features - only available inside CollaborativeRoom
  function CollaborativeContent() {
    // Liveblocks presence hooks
    const [myPresence, updateMyPresence] = useMyPresence()
    const others = useOthers()
    
    // Convert others to remote cursors format
    const remoteCursors = others
      .filter((user) => user.presence?.cursor && typeof user.presence.cursor === 'object')
      .map((user) => {
        const cursor = user.presence.cursor as { x: number; y: number }
        return {
          userId: user.connectionId.toString(),
          userName: user.info?.name || 'Anonymous',
          userAvatar: user.info?.avatar,
          x: cursor.x,
          y: cursor.y,
          lastUpdate: Date.now(),
        }
      })

    // Mouse tracking for cursor sharing
    const handleMouseMove = (e: React.MouseEvent) => {
      updateMyPresence({
        cursor: { x: e.clientX, y: e.clientY }
      })
    }

    // Node creation handlers
    const handleAddNoteNode = () => {
      const newNote = {
        id: `note_${Date.now()}`,
        title: 'Untitled Note',
        blocks: [{
          id: `block_${Date.now()}`,
          type: 'paragraph' as const,
          content: 'Start writing...',
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: []
      }
      addNoteAsNode(newNote)
    }

    const handleAddTaskNode = () => {
      const newTask = {
        id: `task_${Date.now()}`,
        title: 'New Task',
        description: '',
        completed: false,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      addTaskAsNode(newTask)
    }

    const handleAddImageNode = () => {
      const newImage = {
        id: `image_${Date.now()}`,
        title: 'New Image',
        description: '',
        imageUrl: '',
        annotations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      console.log('Add image node:', newImage)
    }

    // Toolbar handlers
    const handleToggleAIPrompt = () => {
      updateCanvasState({ showAIPrompt: !canvasState.showAIPrompt })
    }

    const handleAIPromptChange = (value: string) => {
      updateCanvasState({ aiPrompt: value })
    }

    // Initialize keyboard shortcuts
    useKeyboardShortcuts({
      onSelectAll: selectAllNodes,
      onAddText: addTextNode,
      onAddNote: handleAddNoteNode,
      onAddTask: handleAddTaskNode,
      onAddImage: handleAddImageNode,
      onAddRectangle: () => addShapeNode('rectangle'),
      onAddCircle: () => addShapeNode('circle'),
      onAddTriangle: () => addShapeNode('triangle'),
      onSetSelectMode: setSelectMode,
      onDelete: deleteSelectedNodes,
      activeSidebarItem: canvasState.activeSidebarItem || 'layers',
      onSidebarItemClick: (item) => handleSidebarItemClick(item)
    })

    return (
      <ReactFlowProvider>
        <CanvasProvider
          updateNodeData={updateNodeData}
          toggleNodeMinimized={toggleNodeMinimized}
          copyNode={copyNode}
          deleteNode={deleteNode}
          addNode={addNode}
        >
          <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900" onMouseMove={handleMouseMove}>
            {/* Cursor Overlay for Remote Users */}
            <CursorOverlay remoteCursors={remoteCursors} />

            {/* Top Toolbar */}
            <Toolbar
              canvasState={canvasState}
              onToggleAIPrompt={handleToggleAIPrompt}
              onAIPromptChange={handleAIPromptChange}
              onAIGenerate={handleAIGenerate}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
            />

            <div className="flex flex-1 overflow-hidden">
              {/* Workspace Panel */}
              {canvasState.activeSidebarItem === 'workspace' && (
                <WorkspacePanel
                  workspace={currentWorkspace}
                  onlineUsers={others.map(user => ({
                    userId: user.connectionId.toString(),
                    userName: user.info?.name || 'Anonymous',
                    userAvatar: user.info?.avatar,
                    isOnline: true,
                    lastSeen: Date.now(),
                  }))}
                  onWorkspaceChange={(id) => setWorkspaceId(id)}
                />
              )}

              {/* Primary Sidebar */}
              <PrimarySidebar
                activeSidebarItem={canvasState.activeSidebarItem}
                onSidebarItemClick={handleSidebarItemClick}
                onAddNode={() => {}}
              />

              {/* Secondary Drawing Sidebar */}
              {canvasState.showDrawingSidebar && (
                <DrawingSidebar
                  activeSidebarItem={canvasState.activeSidebarItem}
                  onAddShapeNode={addShapeNode}
                />
              )}

              {/* Templates Panel */}
              {canvasState.activeSidebarItem === 'templates' && (
                <TemplatesPanel
                  onApplyTemplate={applyTemplate}
                />
              )}

              {/* AI Assistant Panel */}
              {canvasState.activeSidebarItem === 'ai' && (
                <AIAssistantPanel />
              )}

              {/* Layers Panel */}
              {canvasState.activeSidebarItem === 'layers' && (
                <PropertiesSidebar
                  selectedNode={selectedNode}
                  layers={layers}
                  nodes={nodes}
                  onUpdateNodeData={updateNodeData}
                  onToggleNodeMinimized={toggleNodeMinimized}
                  onDeleteNode={deleteNode}
                  onCopyNode={copyNode}
                  getNodeProperties={getNodeProperties}
                  onAddDefaultNode={() => addShapeNode('rectangle')}
                />
              )}

              {/* Main Canvas Area */}
              <Canvas
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onAddShapeNode={addShapeNode}
                onAddTextNode={addTextNode}
                onAddNoteNode={handleAddNoteNode}
                onAddTaskNode={handleAddTaskNode}
                onAddImageNode={handleAddImageNode}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                remoteCursors={remoteCursors}
                onMouseMove={handleMouseMove}
              />

              {/* Tasks Panel */}
              {canvasState.showTasksPanel && (
                <TasksPanel
                  tasks={tasks}
                  onAddTask={addTask}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                />
              )}
            </div>

            {/* Collaboration Status Indicator */}
            {others.length > 0 && (
              <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm shadow-lg">
                {others.length} collaborator{others.length > 1 ? 's' : ''} online
              </div>
            )}
          </div>
        </CanvasProvider>
      </ReactFlowProvider>
    )
  }

  return (
    <CollaborativeRoom workspaceId={workspaceId}>
      <CollaborativeContent />
    </CollaborativeRoom>
  )
}