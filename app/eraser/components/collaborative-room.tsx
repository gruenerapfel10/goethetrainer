"use client"

import { ReactNode } from "react"
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react"

interface CollaborativeRoomProps {
  children: ReactNode
  workspaceId: string
}

export function CollaborativeRoom({ children, workspaceId }: CollaborativeRoomProps) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
    >
      <RoomProvider 
        id={`workspace-${workspaceId}`}
        initialPresence={{
          cursor: null,
        }}
      >
        <ClientSideSuspense fallback={<div>Loading collaborative workspace...</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
} 