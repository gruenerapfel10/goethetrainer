"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface NodeOwnershipBadgeProps {
  ownerId: string
  ownerName: string
  ownerAvatar?: string
  isCurrentUser?: boolean
  size?: "sm" | "md" | "lg"
}

export function NodeOwnershipBadge({
  ownerId,
  ownerName,
  ownerAvatar,
  isCurrentUser = false,
  size = "sm",
}: NodeOwnershipBadgeProps) {
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

  const sizeClasses = {
    sm: {
      avatar: "w-6 h-6",
      text: "text-[10px]",
      badge: "px-1.5 py-0.5",
    },
    md: {
      avatar: "w-8 h-8",
      text: "text-xs",
      badge: "px-2 py-1",
    },
    lg: {
      avatar: "w-10 h-10",
      text: "text-sm",
      badge: "px-2.5 py-1.5",
    },
  }

  const currentSize = sizeClasses[size]

  return (
    <div className="absolute -top-2 -left-2 z-10">
      <Badge
        className={`
          flex items-center gap-1 bg-white/95 backdrop-blur-sm border shadow-sm
          ${currentSize.badge} ${currentSize.text}
          ${isCurrentUser ? "border-blue-500 bg-blue-50" : "border-gray-200"}
        `}
        style={{
          borderLeftColor: getUserColor(ownerId),
          borderLeftWidth: "3px",
        }}
      >
        <Avatar className={currentSize.avatar}>
          <AvatarImage src={ownerAvatar} />
          <AvatarFallback
            className={`font-semibold text-white ${size === "sm" ? "text-[8px]" : currentSize.text}`}
            style={{ backgroundColor: getUserColor(ownerId) }}
          >
            {getInitials(ownerName)}
          </AvatarFallback>
        </Avatar>
        
        {size !== "sm" && (
          <span className="text-gray-700 font-medium max-w-16 truncate">
            {isCurrentUser ? "You" : ownerName.split(" ")[0]}
          </span>
        )}
        
        {isCurrentUser && size === "sm" && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </Badge>
    </div>
  )
} 