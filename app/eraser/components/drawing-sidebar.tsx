import React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DRAWING_TOOLS, COLOR_PALETTE } from '../constants'

interface DrawingSidebarProps {
  activeSidebarItem: string | null
  onAddShapeNode: (shapeType: string) => void
}

export const DrawingSidebar: React.FC<DrawingSidebarProps> = ({
  activeSidebarItem,
  onAddShapeNode,
}) => {
  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Drawing Tools
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {DRAWING_TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={activeSidebarItem === tool.id ? "default" : "outline"}
              size="sm"
              className="flex flex-col h-16 p-2"
              onClick={() => onAddShapeNode(tool.id)}
            >
              <tool.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{tool.label}</span>
            </Button>
          ))}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Colors
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PALETTE.map((color, index) => (
              <div 
                key={index}
                className="w-8 h-8 rounded cursor-pointer border-2 border-transparent hover:border-gray-400 transition-all"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 