import React from 'react'
import { 
  ZoomIn, ZoomOut, Undo, Redo, Save, Share2, 
  Download, Sparkles, Command, Users, Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CanvasState } from '../types'

interface ToolbarProps {
  canvasState: CanvasState
  onToggleAIPrompt: () => void
  onAIPromptChange: (value: string) => void
  onAIGenerate: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  canvasState,
  onToggleAIPrompt,
  onAIPromptChange,
  onAIGenerate,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* Project Title */}
          <div className="flex items-center space-x-2">
            <Command className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Input
              defaultValue="Untitled Diagram"
              className="border-none shadow-none text-lg font-semibold bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-colors px-2 py-1 rounded"
            />
          </div>
          
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Workspace</span>
            <span>/</span>
            <span>Projects</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">Current Diagram</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            {/* AI Assistant */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={canvasState.showAIPrompt ? "default" : "ghost"} 
                  size="sm"
                  onClick={onToggleAIPrompt}
                  className="relative"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Assistant
                  {canvasState.showAIPrompt && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate diagram with AI</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />

            {/* History Controls */}
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Undo className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Redo className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onZoomOut} className="h-7 w-7 p-0">
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>

              <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[40px] text-center font-medium">
                {canvasState.zoomLevel}%
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onZoomIn} className="h-7 w-7 p-0">
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Collaboration */}
            <div className="hidden lg:flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="hidden xl:inline">Collaborate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Invite collaborators</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </div>

            {/* Export & Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <span className="font-medium">Export as PNG</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="font-medium">Export as SVG</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="font-medium">Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="font-medium">Export as Markdown</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </TooltipProvider>
        </div>
      </div>

      {/* AI Prompt Bar */}
      {canvasState.showAIPrompt && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center space-x-3 max-w-4xl">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Describe your diagram (e.g., 'user authentication flow with database')"
                value={canvasState.aiPrompt}
                onChange={(e) => onAIPromptChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAIGenerate()}
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm"
              />
            </div>
            <Button 
              onClick={onAIGenerate}
              disabled={!canvasState.aiPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-11">
            Try: "flowchart for user onboarding", "system architecture diagram", or "project timeline"
          </p>
        </div>
      )}
    </>
  )
} 