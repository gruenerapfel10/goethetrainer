"use client"

import { Button } from '@/components/ui/button'
import { Plus, Minus, RotateCcw, Compass, Home } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavigationControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function NavigationControls({ onZoomIn, onZoomOut, onReset }: NavigationControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-8 right-4 flex flex-col gap-2 z-50">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-background/90 backdrop-blur-sm rounded-lg shadow-lg border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onZoomIn}
                className="rounded-none rounded-t-lg"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="h-px bg-border" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onZoomOut}
                className="rounded-none rounded-b-lg"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Reset View */}
        <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="rounded-lg"
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Reset View</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
} 