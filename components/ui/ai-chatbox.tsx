"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useChat } from 'ai/react'

interface AIChatboxProps {
  isOpen: boolean
  onClose: () => void
  context?: any
  category?: string
  placeholder?: string
  title?: string
}

export function AIChatbox({ 
  isOpen, 
  onClose, 
  context, 
  category = 'general',
  placeholder = "Ask me anything about the map...",
  title = "AI Assistant"
}: AIChatboxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/ai/capabilities',
    body: { context, category },
    onToolCall: async ({ toolCall }) => {
      // Handle tool execution on the frontend
      if (context?.mapboxContext) {
        const { toolName, args } = toolCall as { toolName: string; args: Record<string, any> }
        
        try {
          switch (toolName) {
            case 'search_places':
              // Tool already executed on backend, just show results
              break
              
            case 'add_markers':
              if (!context.mapboxContext.addMarkers) break
              
              if (typeof args.name !== 'string' || typeof args.longitude !== 'number' || typeof args.latitude !== 'number') {
                console.error('Invalid marker arguments:', args)
                break
              }
              
              const marker = {
                id: `marker-${Date.now()}`,
                name: args.name,
                longitude: args.longitude,
                latitude: args.latitude,
                category: typeof args.category === 'string' ? args.category : 'custom'
              }
              
              context.mapboxContext.addMarkers([marker])
              break
              
            case 'search_location':
            case 'fly_to_location':
              if (!context.mapboxContext.flyTo) break
              
              if (typeof args.longitude !== 'number' || typeof args.latitude !== 'number') {
                console.error('Invalid location arguments:', args)
                break
              }
              
              context.mapboxContext.flyTo(
                args.longitude,
                args.latitude,
                typeof args.zoom === 'number' ? args.zoom : undefined
              )
              break
              
            case 'generate_area_report':
              if (!context.mapboxContext.addAreaReport) break
              
              if (typeof args.longitude !== 'number' || typeof args.latitude !== 'number') {
                console.error('Invalid report arguments:', args)
                break
              }
              
              await context.mapboxContext.addAreaReport(args.longitude, args.latitude)
              break
              
            case 'set_map_style':
              if (!context.mapboxContext.setMapStyle) break
              
              if (typeof args.style !== 'string') {
                console.error('Invalid style argument:', args)
                break
              }
              
              context.mapboxContext.setMapStyle(args.style)
              break
          }
        } catch (error) {
          console.error('Error executing tool:', toolName, error)
        }
      }
    }
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!isOpen) return null

  return (
    <div className={`fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-out ${
      isMinimized ? 'w-16' : 'w-96'
    }`}>
      <div className="h-full bg-white/8 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isMinimized ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white/20 animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
              <p className="text-white/60 text-xs">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 w-8 h-8 p-0 rounded-lg transition-all"
            >
              {isMinimized ? '⟶' : '⟵'}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 w-8 h-8 p-0 rounded-lg transition-all"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                  <span className="text-xl">🌍</span>
                </div>
                <h4 className="text-white font-medium text-sm mb-1">Welcome back</h4>
                <p className="text-white/60 text-xs leading-relaxed max-w-xs mx-auto">
                  Ask me about locations, navigation, or intelligence reports
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 border border-white/10 text-white'
                } rounded-2xl p-3 transition-all duration-200 hover:scale-[1.02]`}>
                  
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs">AI</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Tool calls */}
                  {message.toolInvocations?.map((toolCall, toolIndex) => (
                    <div key={toolIndex} className="mt-2 p-2 bg-black/10 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded bg-yellow-500/20 flex items-center justify-center">
                          <span className="text-yellow-400 text-xs">⚡</span>
                        </div>
                        <span className="text-yellow-400 text-xs font-medium">{toolCall.toolName}</span>
                      </div>
                      {toolCall.state === 'result' && (toolCall as any).result && (
                        <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                          ✓ {typeof (toolCall as any).result === 'object' ? (toolCall as any).result.message : (toolCall as any).result}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-white/60 text-xs">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-400 text-xs">⚠️</span>
                  <span className="text-red-400 text-xs font-medium">Error</span>
                </div>
                <div className="text-red-400 text-xs">{error.message}</div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-gradient-to-t from-black/10 to-transparent">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  className="bg-white/5 border border-white/20 text-white placeholder:text-white/40 text-sm rounded-xl pr-10 h-10 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 top-1 bottom-1 w-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg text-xs transition-all"
                >
                  {isLoading ? '⏳' : '→'}
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange({ target: { value: "Search Covent Garden" } } as any)}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 rounded-lg border border-white/20 transition-all"
                  disabled={isLoading}
                >
                  🔍 Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange({ target: { value: "Find restaurants" } } as any)}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 rounded-lg border border-white/20 transition-all"
                  disabled={isLoading}
                >
                  🍽️ Food
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange({ target: { value: "Generate report" } } as any)}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 rounded-lg border border-white/20 transition-all"
                  disabled={isLoading}
                >
                  📊 Intel
                </Button>
              </div>
            </form>
            
            <div className="flex items-center justify-between mt-3 text-xs text-white/40">
              <span>⌘K to open</span>
              <span>Global Meridian</span>
            </div>
          </div>
        </div>

        {/* Minimized State */}
        {isMinimized && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Button
              onClick={() => setIsMinimized(false)}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg transition-all hover:scale-105"
            >
              🤖
            </Button>
            <div className="mt-2 text-xs text-white/60 transform -rotate-90 whitespace-nowrap origin-center">
              AI Assistant
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 