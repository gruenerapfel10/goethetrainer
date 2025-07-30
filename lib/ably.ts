import Ably from "ably"

// Simple server-side client
export const ablyRest = typeof window === "undefined" && process.env.ABLY_API_KEY
  ? new Ably.Rest({ key: process.env.ABLY_API_KEY })
  : null

// Channel name helpers
export const getWorkspaceChannel = (workspaceId: string) => `workspace:${workspaceId}`
export const getCursorChannel = (workspaceId: string) => `cursor:${workspaceId}`
export const getPresenceChannel = (workspaceId: string) => `presence:${workspaceId}`
export const getNodesChannel = (workspaceId: string) => `nodes:${workspaceId}`

// Event types
export const EVENTS = {
  NODE_CREATED: "node:created",
  NODE_UPDATED: "node:updated", 
  NODE_DELETED: "node:deleted",
  CURSOR_MOVE: "cursor:move",
  USER_JOIN: "user:join",
  USER_LEAVE: "user:leave",
  PRESENCE_UPDATE: "presence:update",
} as const

export type AblyEvent = typeof EVENTS[keyof typeof EVENTS]

// Data interfaces
export interface CursorData {
  userId: string
  userName: string
  userAvatar?: string
  x: number
  y: number
  timestamp: number
}

export interface NodeData {
  id: string
  type: string
  data: any
  position: { x: number; y: number }
  size?: { width: number; height: number }
  style?: any
  ownerId: string
  version: number
}

export interface PresenceData {
  userId: string
  userName: string
  userAvatar?: string
  isOnline: boolean
  lastSeen: number
}

// Simple function to check if Ably is enabled
export const isAblyEnabled = () => {
  return !!process.env.ABLY_API_KEY
}

// Create a simple Ably client
export const createAblyClient = (userId: string): Ably.Realtime | null => {
  try {
    if (typeof window === "undefined") {
      // Server-side: use API key directly
      if (!process.env.ABLY_API_KEY) {
        return null
      }
      
      return new Ably.Realtime({
        key: process.env.ABLY_API_KEY,
        clientId: userId,
      })
    } else {
      // Client-side: use token authentication
      return new Ably.Realtime({
        authUrl: "/api/ably/token",
        clientId: userId,
        disconnectedRetryTimeout: 15000,  // 15 seconds
        suspendedRetryTimeout: 30000,     // 30 seconds
      })
    }
  } catch (error) {
    console.error("Failed to create Ably client:", error)
    return null
  }
} 