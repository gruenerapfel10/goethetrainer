"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface RemoteCursor {
  userId: string
  userName: string
  userAvatar?: string
  x: number
  y: number
  lastUpdate: number
}

interface CursorOverlayProps {
  remoteCursors: RemoteCursor[]
}

const CursorPointer = ({ cursor }: { cursor: RemoteCursor }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserColor = (userId: string) => {
    // Generate a consistent color based on user ID
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div
      className="absolute pointer-events-none z-50 transition-transform duration-75 ease-out"
      style={{
        transform: `translate(${cursor.x}px, ${cursor.y}px)`,
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={getUserColor(cursor.userId)}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User label */}
      <div
        className="absolute top-5 left-5 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-lg border text-xs font-medium"
        style={{
          borderLeftColor: getUserColor(cursor.userId),
          borderLeftWidth: "3px",
        }}
      >
        <Avatar className="w-4 h-4">
          <AvatarImage src={cursor.userAvatar} />
          <AvatarFallback 
            className="text-[8px] font-semibold text-white"
            style={{ backgroundColor: getUserColor(cursor.userId) }}
          >
            {getInitials(cursor.userName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-gray-700 max-w-20 truncate">
          {cursor.userName}
        </span>
      </div>
    </div>
  )
}

export function CursorOverlay({ remoteCursors }: CursorOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {remoteCursors.map((cursor) => (
        <CursorPointer key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  )
} 