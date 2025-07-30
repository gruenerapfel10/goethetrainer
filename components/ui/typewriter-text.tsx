"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SearchIcon } from "lucide-react"

interface TypewriterTextProps {
  text: string
  delay?: number
  className?: string
  showIcon?: boolean
  duration?: number // Duration in milliseconds for the entire animation
  unwrite?: boolean
  unwriteDelay?: number
}

export const TypewriterText = ({
  text,
  delay = 0,
  className,
  showIcon = false,
  duration = 1000,
  unwrite = false,
  unwriteDelay = 1000,
}: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [showSearchIcon, setShowSearchIcon] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsStarted(true)
    }, delay)

    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    if (!isStarted) return

    const calculatedSpeed = duration / text.length

    if (isDeleting) {
      if (displayText.length > 0) {
        const timer = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1))
        }, calculatedSpeed / 2) // Delete faster
        return () => clearTimeout(timer)
      }
    } else {
      if (displayText.length < text.length) {
        const timer = setTimeout(() => {
          setDisplayText((prev) => text.slice(0, prev.length + 1))
        }, calculatedSpeed)
        return () => clearTimeout(timer)
      } else {
        // Finished typing
        if (unwrite) {
          const unwriteTimer = setTimeout(() => {
            setIsDeleting(true)
          }, unwriteDelay)
          return () => clearTimeout(unwriteTimer)
        } else if (showIcon) {
          const showIconTimer = setTimeout(() => {
            setShowSearchIcon(true)
          }, 200)
          return () => clearTimeout(showIconTimer)
        }
      }
    }
  }, [displayText, text, isStarted, showIcon, duration, unwrite, unwriteDelay, isDeleting])

  return (
    <span className={cn("inline-block", className)}>
      {displayText}
      {(displayText.length < text.length || isDeleting) && <span className="animate-pulse text-primary">|</span>}
      {showSearchIcon && (
        <SearchIcon className="inline-block ml-2 h-8 w-8 md:h-10 w-10 lg:h-12 w-12 text-primary/70 animate-in fade-in duration-300" />
      )}
    </span>
  )
}
