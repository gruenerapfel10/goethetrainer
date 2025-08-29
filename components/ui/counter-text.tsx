"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CounterTextProps {
  target: number
  delay?: number
  duration?: number
  className?: string
}

export const CounterText = ({ target, delay = 0, duration = 2000, className }: CounterTextProps) => {
  const [count, setCount] = useState(0)
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsStarted(true)
    }, delay)

    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    if (!isStarted) return

    const increment = target / (duration / 16) // 60fps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [isStarted, target, duration])

  return <span className={cn("font-mono font-semibold tabular-nums", className)}>{count.toLocaleString()}</span>
}
