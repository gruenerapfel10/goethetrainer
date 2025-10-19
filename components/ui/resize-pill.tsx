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
  const [isDragging, setIsDragging] = React.useState(false)
  const startX = React.useRef(0)
  const startWidth = React.useRef(defaultWidth)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.clientX
    
    // Get current width from the sidebar element
    const sidebar = (e.target as HTMLElement).closest('aside') || (e.target as HTMLElement).closest('[data-resizable="true"]')
    if (sidebar) {
      startWidth.current = sidebar.getBoundingClientRect().width
    }
    
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX.current
      
      // For left sidebar: drag right = positive delta = increase width
      // For right sidebar: drag left = negative delta = increase width
      const newWidth = side === "left" 
        ? startWidth.current + deltaX
        : startWidth.current - deltaX
      
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      
      // Find and update the sidebar directly
      const sidebar = document.querySelector(`aside[data-side="${side}"]`) as HTMLElement
      if (sidebar) {
        sidebar.style.width = `${clampedWidth}px`
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Get final width and save
      const sidebar = document.querySelector(`aside[data-side="${side}"]`) as HTMLElement
      if (sidebar) {
        const finalWidth = sidebar.getBoundingClientRect().width
        onWidthChange?.(finalWidth)
        
        // Save to cookie
        const cookieName = `${side}_sidebar_width`
        document.cookie = `${cookieName}=${finalWidth}; path=/; max-age=${60 * 60 * 24 * 7}`
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, side, minWidth, maxWidth, onWidthChange])

  return (
    <>
      <div 
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-20 w-1.5 rounded-full cursor-col-resize z-50",
          "bg-primary/40 hover:bg-primary/70 transition-all",
          side === "left" ? "right-0" : "left-0",
          isDragging && "bg-primary scale-y-125"
        )}
      />
      
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-col-resize" />
      )}
    </>
  )
}