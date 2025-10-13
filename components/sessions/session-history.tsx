'use client'

import { useState, useEffect } from 'react'
import { SessionCard } from './session-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { sessionService, type Session, type SkillType } from '@/lib/firebase/session-service'
import { useAuth } from '@/context/firebase-auth-context'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

interface SessionHistoryProps {
  skillType?: SkillType
  onSessionClick?: (session: Session) => void
}

export function SessionHistory({ skillType, onSessionClick }: SessionHistoryProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadSessions = async (loadMore = false) => {
    if (!user) return

    try {
      if (loadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const { sessions: newSessions, lastDoc: newLastDoc } = await sessionService.getUserSessions(
        user.uid,
        skillType,
        loadMore ? lastDoc : undefined
      )

      if (loadMore) {
        setSessions(prev => [...prev, ...newSessions])
      } else {
        setSessions(newSessions)
      }

      setLastDoc(newLastDoc)
      setHasMore(newSessions.length === 20) // Assuming page size is 20
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [user, skillType])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start your first {skillType || 'learning'} session to see your progress here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => onSessionClick?.(session)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadSessions(true)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}