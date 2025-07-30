import React from 'react'
import { NodeProps } from 'reactflow'
import { ShapeNodeData } from '../../types'
import { BaseNode } from './shared'

// Rectangle Node
export const RectangleNode: React.FC<NodeProps<ShapeNodeData>> = ({ data, selected, id }) => {
  return (
    <BaseNode 
      data={data} 
      selected={selected}
    >
      <div className="flex flex-col gap-2">
        {data.description && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {data.description}
          </p>
        )}
        
        <div className="text-xs text-gray-400">
          {data.width}x{data.height}
        </div>
      </div>
    </BaseNode>
  )
}

// Circle Node
export const CircleNode: React.FC<NodeProps<ShapeNodeData>> = ({ data, selected, id }) => {
  return (
    <BaseNode 
      data={data} 
      selected={selected}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-xs font-medium text-gray-900">
          Circle
        </div>
        {!data.isMinimized && data.description && (
          <div className="text-xs text-gray-600 text-center">
            {data.description}
          </div>
        )}
        {!data.isMinimized && (
          <div className="text-xs text-gray-400">
            {data.width}×{data.height}
          </div>
        )}
      </div>
    </BaseNode>
  )
}

// Triangle Node  
export const TriangleNode: React.FC<NodeProps<ShapeNodeData>> = ({ data, selected, id }) => {
  return (
    <BaseNode 
      data={data} 
      selected={selected}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-xs font-medium text-gray-900">
          Triangle
        </div>
        {!data.isMinimized && data.description && (
          <div className="text-xs text-gray-600 text-center">
            {data.description}
          </div>
        )}
        {!data.isMinimized && (
          <div className="text-xs text-gray-400">
            {data.width}×{data.height}
          </div>
        )}
      </div>
    </BaseNode>
  )
} 