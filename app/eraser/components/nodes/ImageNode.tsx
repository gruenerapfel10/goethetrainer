import React, { useState } from 'react'
import { NodeProps } from 'reactflow'
import { ImageNodeData } from '../../types'
import { BaseNode, Button, Input } from './shared'

export const ImageNode: React.FC<NodeProps<ImageNodeData>> = ({ data, selected, id }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [annotations, setAnnotations] = useState<Array<{
    id: string
    x: number
    y: number
    text: string
    color: string
  }>>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPath, setDrawingPath] = useState<string>('')
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)
  const [showTools, setShowTools] = useState(false)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        console.log('Image uploaded:', id, e.target?.result)
        // Here you would update the node data with the image URL
      }
      reader.readAsDataURL(file)
    }
  }

  const addAnnotation = (x: number, y: number) => {
    const newAnnotation = {
      id: `annotation_${Date.now()}`,
      x,
      y,
      text: 'New annotation',
      color: '#3b82f6'
    }
    setAnnotations(prev => [...prev, newAnnotation])
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showTools) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    addAnnotation(x, y)
  }

  return (
    <BaseNode data={data} selected={selected}>
      <div 
        className="relative overflow-hidden"
        style={{
          width: data.isMinimized ? 'auto' : (data.width || 300),
          height: data.isMinimized ? 'auto' : (data.height || 200),
          minWidth: data.isMinimized ? '120px' : '200px',
          minHeight: data.isMinimized ? '40px' : '150px',
        }}
      >
        {data.isMinimized ? (
          <div className="flex items-center gap-2 text-xs text-gray-600 p-2">
            🖼️ {data.title || 'Image'} • Click to expand
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Image Container */}
            <div 
              className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden cursor-crosshair"
              onClick={handleCanvasClick}
            >
              {data.imageUrl ? (
                <>
                  <img 
                    src={data.imageUrl} 
                    alt={data.title || 'Uploaded image'}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  
                  {/* Annotations Overlay */}
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: annotation.x,
                        top: annotation.y,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <div 
                        className="bg-white shadow-lg rounded-lg p-2 border-2 text-xs font-medium max-w-32"
                        style={{ borderColor: annotation.color }}
                      >
                        {annotation.text}
                        <div 
                          className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent"
                          style={{ borderTopColor: annotation.color }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Drawing Canvas Overlay */}
                  <canvas
                    ref={setCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                    width={data.width || 300}
                    height={data.height || 200}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div className="text-sm mb-3">No image uploaded</div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" className="text-xs">
                      📁 Upload Image
                    </Button>
                  </label>
                </div>
              )}
            </div>

            {/* Tools and Controls */}
            {data.imageUrl && (
              <div className="border-t border-gray-200 p-2 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-700">Tools</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTools(!showTools)}
                    className="h-6 px-2 text-xs"
                  >
                    {showTools ? '🔧 Hide' : '🔧 Show'}
                  </Button>
                </div>

                {showTools && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={isDrawing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDrawing(!isDrawing)}
                      className="h-6 px-2 text-xs"
                    >
                      ✏️ Draw
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Add text annotation')}
                      className="h-6 px-2 text-xs"
                    >
                      💬 Annotate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnnotations([])
                        // Clear canvas
                        if (canvasRef) {
                          const ctx = canvasRef.getContext('2d')
                          ctx?.clearRect(0, 0, canvasRef.width, canvasRef.height)
                        }
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      🗑️ Clear
                    </Button>
                  </div>
                )}

                {/* Description */}
                <div className="mt-2">
                  {isEditing ? (
                    <Input
                      value={data.description || ''}
                      onChange={(e) => console.log('Update description:', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditing(false)
                        if (e.key === 'Escape') setIsEditing(false)
                      }}
                      onBlur={() => setIsEditing(false)}
                      placeholder="Add a description..."
                      className="text-xs h-6"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-xs text-gray-600 cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => setIsEditing(true)}
                    >
                      {data.description || 'Add a description...'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  )
} 