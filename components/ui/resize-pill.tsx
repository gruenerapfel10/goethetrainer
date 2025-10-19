"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResizePillProps {
  side: "left" | "right"
  onWidthChange?: (width: number) => void
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

export const ResizePill = ({ 
  side, 
  onWidthChange,
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 256
}: ResizePillProps) => {
  const [isResizing, setIsResizing] = React.useState(false)
  const [width, setWidth] = React.useState(defaultWidth)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const container = containerRef.current.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      let newWidth: number

      if (side === "left") {
        // Left sidebar: measure from left edge of container to mouse position
        newWidth = e.clientX - containerRect.left
      } else {
        // Right sidebar: measure from right edge of container to mouse position
        newWidth = containerRect.right - e.clientX
      }

      // Clamp the width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      
      setWidth(newWidth)
      onWidthChange?.(newWidth)
      
      // Apply the width directly to the parent element
      if (container) {
        container.style.width = `${newWidth}px`
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Save width to cookie
      const cookieName = side === "left" ? "left_sidebar_width" : "right_sidebar_width"
      document.cookie = `${cookieName}=${width}; path=/; max-age=${60 * 60 * 24 * 7}`
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, side, minWidth, maxWidth, onWidthChange, width])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <>
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 h-full w-3 z-50 cursor-col-resize group",
          side === "left" ? "-right-1.5" : "-left-1.5",
          "hover:bg-primary/10 active:bg-primary/20"
        )}
      >
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 h-20 w-1 rounded-full",
          side === "left" ? "right-1" : "left-1",
          "bg-border group-hover:bg-primary/50 transition-colors",
          isResizing && "bg-primary"
        )} />
      </div>
      {/* Overlay to capture mouse events when resizing */}
      {isResizing && (
        <div 
          className="fixed inset-0 z-[100] cursor-col-resize" 
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </>
  )
}