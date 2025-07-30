import React, { useState } from 'react'
import { Search, Layout, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Template } from '../types'
import { DIAGRAM_TEMPLATES } from '../constants'

interface TemplatesPanelProps {
  onApplyTemplate: (template: Template) => void
}

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  onApplyTemplate,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(DIAGRAM_TEMPLATES.map(t => t.category)))]

  const filteredTemplates = DIAGRAM_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Templates</h3>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                selectedCategory === category
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No templates found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onApplyTemplate(template)}
              >
                {/* Template Preview */}
                <div className="w-full h-32 bg-gray-50 dark:bg-gray-800 rounded-md mb-3 flex items-center justify-center relative overflow-hidden">
                  {/* Simple visualization of nodes */}
                  <div className="relative w-full h-full p-2">
                    {template.nodes.slice(0, 3).map((node, index) => (
                      <div
                        key={node.id}
                        className="absolute w-8 h-6 rounded text-xs flex items-center justify-center text-white font-medium"
                        style={{
                          backgroundColor: node.data.stroke || '#3b82f6',
                          left: `${20 + index * 25}%`,
                          top: `${30 + index * 15}%`,
                        }}
                      >
                        {node.type?.charAt(0).toUpperCase() || 'N'}
                      </div>
                    ))}
                    
                    {/* Connection lines */}
                    {template.edges.slice(0, 2).map((edge, index) => (
                      <div
                        key={edge.id}
                        className="absolute w-8 h-0.5 bg-gray-400"
                        style={{
                          left: `${35 + index * 25}%`,
                          top: `${45 + index * 15}%`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity rounded-md" />
                </div>

                {/* Template Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {template.name}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                      {template.category}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>{template.nodes.length} nodes</span>
                      {template.edges.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{template.edges.length} connections</span>
                        </>
                      )}
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onApplyTemplate(template)
                      }}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Use
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Click any template to apply it to your canvas
        </p>
      </div>
    </div>
  )
} 