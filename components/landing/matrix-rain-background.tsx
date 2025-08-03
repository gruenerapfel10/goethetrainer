"use client"

import { useState, useEffect, useMemo } from "react"

const CHARS = ["M", "U", "A"]
const FONT_SIZE = 18
const DENSITY = 0.8

export function MatrixRainBackground() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  const columns = useMemo(() => {
    if (dimensions.width === 0) return []
    const numCols = Math.floor((dimensions.width / (FONT_SIZE * 0.9)) * DENSITY)
    const numRows = Math.floor(dimensions.height / (FONT_SIZE * 1.1)) + 1
    return Array.from({ length: numCols }).map(() => {
      const sequence = []
      for (let i = 0; i < numRows; i++) {
        sequence.push(CHARS[i % CHARS.length])
      }
      // Duplicate for seamless loop
      return [...sequence, ...sequence]
    })
  }, [dimensions])

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-blue-600" aria-hidden="true">
      <div className="flex h-full w-full justify-between">
        {columns.map((chars, i) => (
          <div
            key={i}
            className="flex flex-col font-mono uppercase text-white/20"
            style={{
              fontSize: `${FONT_SIZE}px`,
              animation: `fall ${40 + Math.random() * 20}s linear -${Math.random() * 60}s infinite`,
            }}
          >
            {chars.map((char, j) => (
              <span key={j} className="leading-tight">
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
