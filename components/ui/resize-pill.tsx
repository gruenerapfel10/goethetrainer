"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResizePillProps {
  side: "left" | "right"
  onResize?: (width: number) => void
  minWidth?: number
  maxWidth?: number
  currentWidth?: number
}

export const ResizePill = ({ 
  side, 
  onResize,
  minWidth = 200,
  maxWidth = 600,
  currentWidth = 256
}: ResizePillProps) => {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isHovering, setIsHovering] = React.useState(false)
  const startXRef = React.useRef(0)
  const startWidthRef = React.useRef(0)

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!onResize) return
    
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = currentWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [currentWidth, onResize])

  React.useEffect(() => {
    if (!isDragging || !onResize) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      // For left sidebar: positive delta = expand right
      // For right sidebar: negative delta = expand left
      const delta = side === "left" 
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX
      
      const newWidth = startWidthRef.current + delta
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        onResize(clampedWidth)
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, side, onResize, minWidth, maxWidth])

  // If no onResize handler, just show a static pill
  if (!onResize) {
    return (
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 h-16 w-1.5 rounded-full bg-primary/30",
        side === "left" ? "-right-0.5" : "-left-0.5"
      )} />
    )
  }

  return (
    <>
      <div 
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "absolute top-0 h-full w-2 z-50 group cursor-col-resize",
          side === "left" ? "-right-1" : "-left-1",
          "hover:bg-primary/5 transition-colors"
        )}
      >
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 h-16 w-1.5 rounded-full transition-all",
          side === "left" ? "right-0.5" : "left-0.5",
          isDragging ? "bg-primary/60 scale-y-125" : isHovering ? "bg-primary/50" : "bg-primary/30"
        )} />
      </div>
      {isDragging && (
        <div className="fixed inset-0 z-40" style={{ cursor: 'col-resize' }} />
      )}
    </>
  )
}