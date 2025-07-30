import React, { createContext, useContext } from 'react'
import { NodeData } from '../types'

export interface CanvasContextType {
  updateNodeData: (nodeId: string, updates: Partial<NodeData>) => void
  toggleNodeMinimized: (nodeId: string) => void
  copyNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  addNode: (nodeData: NodeData) => void
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined)

export const useCanvasContext = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider')
  }
  return context
}

interface CanvasProviderProps {
  children: React.ReactNode
  updateNodeData: (nodeId: string, updates: Partial<NodeData>) => void
  toggleNodeMinimized: (nodeId: string) => void
  copyNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  addNode: (nodeData: NodeData) => void
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  children,
  updateNodeData,
  toggleNodeMinimized,
  copyNode,
  deleteNode,
  addNode,
}) => {
  return (
    <CanvasContext.Provider
      value={{
        updateNodeData,
        toggleNodeMinimized,
        copyNode,
        deleteNode,
        addNode,
      }}
    >
      {children}
    </CanvasContext.Provider>
  )
} 