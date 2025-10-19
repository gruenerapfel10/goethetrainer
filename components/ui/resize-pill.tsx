"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar/sidebar-context"
import { SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX } from "@/components/ui/sidebar/sidebar-context"

interface ResizePillProps {
  side: "left" | "right"
}

export const ResizePill = ({ side }: ResizePillProps) => {
  const { width, setWidth, isResizing, setIsResizing } = useSidebar()
  const [isDragging, setIsDragging] = React.useState(false)
  const startXRef = React.useRef(0)
  const startWidthRef = React.useRef(0)

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width, setIsResizing])

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const delta = side === "left" 
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX
      
      const newWidth = startWidthRef.current + delta
      const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_WIDTH_MIN), SIDEBAR_WIDTH_MAX)
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        setWidth(clampedWidth)
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, side, setWidth, setIsResizing])

  return (
    <>
      <div 
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 h-full w-2 z-50 group cursor-col-resize",
          side === "left" ? "-right-1" : "-left-1",
          "hover:bg-primary/5 transition-colors"
        )}
      >
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 h-16 w-1.5 rounded-full transition-all",
          side === "left" ? "right-0.5" : "left-0.5",
          isResizing ? "bg-primary/60 scale-y-125" : "bg-primary/30 group-hover:bg-primary/50"
        )} />
      </div>
      {isResizing && (
        <div className="fixed inset-0 z-40" style={{ cursor: 'col-resize' }} />
      )}
    </>
  )
}