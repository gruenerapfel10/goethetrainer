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
  const [isHovering, setIsHovering] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const finalWidthRef = React.useRef(defaultWidth)

  React.useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      // Get the sidebar element (parent of the resize pill container)
      const sidebar = containerRef.current.closest('aside') || containerRef.current.closest('[data-sidebar]') || containerRef.current.parentElement
      if (!sidebar) return

      const sidebarRect = sidebar.getBoundingClientRect()
      let newWidth: number

      if (side === "left") {
        // Left sidebar: measure from left edge to mouse
        newWidth = e.clientX - sidebarRect.left
      } else {
        // Right sidebar: measure from mouse to right edge
        newWidth = sidebarRect.right - e.clientX
      }

      // Clamp the width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      
      // Directly update the DOM for instant feedback
      sidebar.style.width = `${newWidth}px`
      finalWidthRef.current = newWidth
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setIsHovering(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Call the callback with the final width
      if (onWidthChange) {
        onWidthChange(finalWidthRef.current)
      }
      
      // Save width to cookie
      const cookieName = side === "left" ? "left_sidebar_width" : "right_sidebar_width"
      document.cookie = `${cookieName}=${finalWidthRef.current}; path=/; max-age=${60 * 60 * 24 * 7}`
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, side, minWidth, maxWidth, onWidthChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <>
      {/* Invisible hit area for better UX */}
      <div 
        ref={containerRef}
        className={cn(
          "absolute top-0 h-full w-2 z-50",
          side === "left" ? "-right-1" : "-left-1"
        )}
      >
        {/* The visible pill */}
        <div 
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => !isResizing && setIsHovering(false)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-16 w-1.5 rounded-full cursor-col-resize",
            "transition-all duration-200",
            side === "left" ? "right-0.5" : "left-0.5",
            isResizing ? "bg-primary h-24" : isHovering ? "bg-primary/50" : "bg-border/50",
            isHovering && !isResizing && "scale-y-110"
          )}
        />
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