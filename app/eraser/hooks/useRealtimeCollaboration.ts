"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  createAblyClient, 
  getWorkspaceChannel, 
  getCursorChannel, 
  getPresenceChannel, 
  getNodesChannel,
  EVENTS,
  CursorData,
  NodeData,
  PresenceData 
} from "@/lib/ably"
import type Ably from "ably"

interface UseRealtimeCollaborationProps {
  workspaceId: string
  onNodeUpdate?: (node: NodeData) => void
  onNodeCreate?: (node: NodeData) => void
  onNodeDelete?: (nodeId: string) => void
}

interface RemoteCursor {
  userId: string
  userName: string
  userAvatar?: string
  x: number
  y: number
  lastUpdate: number
}

interface OnlineUser {
  userId: string
  userName: string
  userAvatar?: string
  isOnline: boolean
  lastSeen: number
}

export function useRealtimeCollaboration({
  workspaceId,
  onNodeUpdate,
  onNodeCreate,
  onNodeDelete,
}: UseRealtimeCollaborationProps) {
  const { data: session } = useSession()
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map())
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  
  const ablyClientRef = useRef<Ably.Realtime | null>(null)
  const isInitializedRef = useRef(false)
  
  // Initialize Ably connection once
  useEffect(() => {
    if (!workspaceId || !session?.user?.id || isInitializedRef.current) {
      return
    }

    const initializeConnection = async () => {
      try {
        const client = createAblyClient(session.user.id)
        if (!client) {
          console.log("Real-time collaboration disabled - Ably not configured")
          return
        }

        ablyClientRef.current = client
        isInitializedRef.current = true

        // Connect manually
        client.connect()

        // Set up connection listeners
        client.connection.on('connected', () => {
          console.log("Real-time collaboration connected")
          setIsConnected(true)
        })

        client.connection.on('disconnected', () => {
          console.log("Real-time collaboration disconnected")
          setIsConnected(false)
        })

        client.connection.on('failed', () => {
          console.log("Real-time collaboration failed")
          setIsConnected(false)
        })

        // Set up channels
        const cursorChannel = client.channels.get(getCursorChannel(workspaceId))
        const presenceChannel = client.channels.get(getPresenceChannel(workspaceId))
        const nodesChannel = client.channels.get(getNodesChannel(workspaceId))

        // Subscribe to cursor movements
        cursorChannel.subscribe(EVENTS.CURSOR_MOVE, (message: Ably.Message) => {
          const cursorData = message.data as CursorData
          if (cursorData.userId !== session.user.id) {
            setRemoteCursors(prev => {
              const updated = new Map(prev)
              updated.set(cursorData.userId, {
                userId: cursorData.userId,
                userName: cursorData.userName,
                userAvatar: cursorData.userAvatar,
                x: cursorData.x,
                y: cursorData.y,
                lastUpdate: cursorData.timestamp,
              })
              return updated
            })
          }
        })

        // Subscribe to presence updates
        presenceChannel.subscribe(EVENTS.PRESENCE_UPDATE, (message: Ably.Message) => {
          const presenceData = message.data as PresenceData
          if (presenceData.userId !== session.user.id) {
            setOnlineUsers(prev => {
              const updated = new Map(prev)
              updated.set(presenceData.userId, {
                userId: presenceData.userId,
                userName: presenceData.userName,
                userAvatar: presenceData.userAvatar,
                isOnline: presenceData.isOnline,
                lastSeen: presenceData.lastSeen,
              })
              return updated
            })
          }
        })

        // Subscribe to node events
        if (onNodeUpdate) {
          nodesChannel.subscribe(EVENTS.NODE_UPDATED, (message: Ably.Message) => {
            const nodeData = message.data as NodeData
            if (nodeData.ownerId !== session.user.id) {
              onNodeUpdate(nodeData)
            }
          })
        }

        if (onNodeCreate) {
          nodesChannel.subscribe(EVENTS.NODE_CREATED, (message: Ably.Message) => {
            const nodeData = message.data as NodeData
            if (nodeData.ownerId !== session.user.id) {
              onNodeCreate(nodeData)
            }
          })
        }

        if (onNodeDelete) {
          nodesChannel.subscribe(EVENTS.NODE_DELETED, (message: Ably.Message) => {
            const { nodeId, ownerId } = message.data
            if (ownerId !== session.user.id) {
              onNodeDelete(nodeId)
            }
          })
        }

      } catch (error) {
        console.error("Failed to initialize real-time collaboration:", error)
      }
    }

    initializeConnection()

    // Cleanup on unmount
    return () => {
      if (ablyClientRef.current) {
        ablyClientRef.current.close()
        ablyClientRef.current = null
      }
      isInitializedRef.current = false
    }
  }, [workspaceId, session?.user?.id, onNodeUpdate, onNodeCreate, onNodeDelete])

  // Send cursor position (throttled)
  const lastCursorSent = useRef(0)
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (!isConnected || !session?.user?.id || !ablyClientRef.current) return
    
    const now = Date.now()
    if (now - lastCursorSent.current < 50) return // 20fps max

    lastCursorSent.current = now

    const cursorChannel = ablyClientRef.current.channels.get(getCursorChannel(workspaceId))
    cursorChannel.publish(EVENTS.CURSOR_MOVE, {
      userId: session.user.id,
      userName: session.user.name || "Anonymous",
      userAvatar: session.user.image,
      x,
      y,
      timestamp: now,
    })
  }, [isConnected, session?.user, workspaceId])

  // Broadcast node operations
  const broadcastNodeUpdate = useCallback((node: NodeData) => {
    if (!isConnected || !ablyClientRef.current) return
    const channel = ablyClientRef.current.channels.get(getNodesChannel(workspaceId))
    channel.publish(EVENTS.NODE_UPDATED, node)
  }, [isConnected, workspaceId])

  const broadcastNodeCreate = useCallback((node: NodeData) => {
    if (!isConnected || !ablyClientRef.current) return
    const channel = ablyClientRef.current.channels.get(getNodesChannel(workspaceId))
    channel.publish(EVENTS.NODE_CREATED, node)
  }, [isConnected, workspaceId])

  const broadcastNodeDelete = useCallback((nodeId: string, ownerId: string) => {
    if (!isConnected || !ablyClientRef.current) return
    const channel = ablyClientRef.current.channels.get(getNodesChannel(workspaceId))
    channel.publish(EVENTS.NODE_DELETED, { nodeId, ownerId })
  }, [isConnected, workspaceId])

  return {
    // State
    remoteCursors: Array.from(remoteCursors.values()),
    onlineUsers: Array.from(onlineUsers.values()),
    isConnected,
    
    // Actions
    sendCursorPosition,
    broadcastNodeUpdate,
    broadcastNodeCreate,
    broadcastNodeDelete,
  }
} 