import React, { useState } from 'react'
import { Node } from 'reactflow'
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock, Plus, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NodeData, NodePropertyGroup, Layer } from '../types'
import { WysiwygEditor } from './wysiwyg-editor'

interface PropertiesSidebarProps {
  selectedNode: Node<NodeData> | null
  layers: Layer[]
  nodes: Node<NodeData>[]
  onUpdateNodeData: (nodeId: string, updates: Partial<NodeData>) => void
  onToggleNodeMinimized: (nodeId: string) => void
  onDeleteNode: (nodeId: string) => void
  onCopyNode: (nodeId: string) => void
  getNodeProperties: (node: Node<NodeData>) => NodePropertyGroup[]
  onAddDefaultNode: () => void
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  selectedNode,
  layers,
  nodes,
  onUpdateNodeData,
  onToggleNodeMinimized,
  onDeleteNode,
  onCopyNode,
  getNodeProperties,
  onAddDefaultNode,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (groupTitle: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupTitle)) {
      newCollapsed.delete(groupTitle)
    } else {
      newCollapsed.add(groupTitle)
    }
    setCollapsedGroups(newCollapsed)
  }

  const handlePropertyChange = (key: string, value: any) => {
    if (!selectedNode) return
    onUpdateNodeData(selectedNode.id, { [key]: value })
  }

  const renderPropertyInput = (property: any) => {
    switch (property.type) {
      case 'text':
        return (
          <Input
            value={property.value || ''}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            className="text-sm"
          />
        )
      
      case 'textarea':
        // Special handling for note descriptions - use WYSIWYG editor
        if (selectedNode?.data.type === 'note' && property.key === 'description') {
          return (
            <div className="border rounded-lg bg-white dark:bg-gray-900 max-h-60 overflow-hidden">
              <WysiwygEditor
                content={property.value || ''}
                onChange={(newContent: string) => handlePropertyChange(property.key, newContent)}
                placeholder="Start writing your note..."
                editable={true}
                minimal={true}
              />
            </div>
          )
        }
        
        return (
          <Textarea
            value={property.value || ''}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            className="text-sm min-h-[80px]"
            rows={3}
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={property.value || 0}
            onChange={(e) => handlePropertyChange(property.key, parseFloat(e.target.value) || 0)}
            min={property.min}
            max={property.max}
            step={property.step || 1}
            className="text-sm"
          />
        )
      
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={property.value || '#000000'}
              onChange={(e) => handlePropertyChange(property.key, e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={property.value || '#000000'}
              onChange={(e) => handlePropertyChange(property.key, e.target.value)}
              className="text-sm flex-1"
            />
          </div>
        )
      
      case 'select':
        return (
          <Select
            value={property.value}
            onValueChange={(value: string) => handlePropertyChange(property.key, value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {property.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'boolean':
        return (
          <Button
            variant={property.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePropertyChange(property.key, !property.value)}
            className="w-full justify-start"
          >
            {property.value ? 'Enabled' : 'Disabled'}
          </Button>
        )
      
      case 'date':
        return (
          <Input
            type="date"
            value={property.value ? new Date(property.value).toISOString().split('T')[0] : ''}
            onChange={(e) => handlePropertyChange(property.key, e.target.value ? new Date(e.target.value) : null)}
            className="text-sm"
          />
        )
      

      default:
        return (
          <Input
            value={property.value || ''}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            className="text-sm"
          />
        )
    }
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Layers & Properties
        </h3>
        
        {selectedNode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedNode.data.type.charAt(0).toUpperCase() + selectedNode.data.type.slice(1)} Node
              </span>
              <Badge 
                variant="secondary"
                className={`text-xs ${
                  selectedNode.data.status === 'working' ? 'bg-blue-100 text-blue-800' :
                  selectedNode.data.status === 'complete' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {selectedNode.data.status || 'inactive'}
              </Badge>
            </div>
            
            {/* Node Actions */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleNodeMinimized(selectedNode.id)}
                className="flex-1"
              >
                {selectedNode.data.isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                {selectedNode.data.isMinimized ? 'Expand' : 'Minimize'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyNode(selectedNode.id)}
              >
                Copy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteNode(selectedNode.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Select a node to edit its properties
            </p>
            <Button onClick={onAddDefaultNode} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
          </div>
        )}
      </div>

      {/* Node Properties */}
      {selectedNode && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {getNodeProperties(selectedNode).map((group) => (
              <div key={group.title} className="space-y-2">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {group.title}
                  </h4>
                  {collapsedGroups.has(group.title) ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {!collapsedGroups.has(group.title) && (
                  <div className="space-y-3 pl-2">
                    {group.properties.map((property) => (
                      <div key={property.key} className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {property.label}
                        </Label>
                        {renderPropertyInput(property)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layers Section */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">
            Canvas Layers ({nodes.length} nodes)
          </h4>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  selectedNode?.id === node.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: node.data.fill || '#ffffff' }}
                  />
                  <span className="truncate">
                    {node.data.title || node.data.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="w-5 h-5 p-0">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="w-5 h-5 p-0">
                    <Lock className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 