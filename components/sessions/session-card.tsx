'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Trophy, Target, BookOpen, PenTool, Headphones, Mic } from 'lucide-react'
import type { Session, SkillType } from '@/lib/firebase/session-service'

interface SessionCardProps {
  session: Session
  onClick?: () => void
}

const skillIcons: Record<SkillType, any> = {
  reading: BookOpen,
  writing: PenTool,
  listening: Headphones,
  speaking: Mic,
}

const statusColors = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  abandoned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const Icon = skillIcons[session.skillType]
  const formattedDate = formatDistanceToNow(session.startedAt.toDate(), { addSuffix: true })
  const durationMinutes = Math.floor(session.duration / 60)
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {session.contentTitle || `${session.skillType} Session`}
              </h3>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <Badge className={statusColors[session.status]} variant="outline">
            {session.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Level and Difficulty */}
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">
            {session.level}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {session.difficulty}
          </Badge>
          {session.topic && (
            <Badge variant="secondary" className="text-xs">
              {session.topic}
            </Badge>
          )}
        </div>
        
        {/* Progress Bar */}
        {session.status !== 'abandoned' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(session.completionRate)}%</span>
            </div>
            <Progress value={session.completionRate} className="h-2" />
          </div>
        )}
        
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-xs font-medium">{Math.round(session.score)}</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </div>
          <div className="text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs font-medium">{Math.round(session.accuracy)}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs font-medium">{durationMinutes}m</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
        </div>
        
        {/* Skill-specific metrics */}
        {session.metrics && (
          <div className="pt-2 border-t">
            {session.skillType === 'reading' && session.metrics.wordsPerMinute && (
              <p className="text-xs text-muted-foreground">
                {session.metrics.wordsPerMinute} words/min
              </p>
            )}
            {session.skillType === 'writing' && session.metrics.wordCount && (
              <p className="text-xs text-muted-foreground">
                {session.metrics.wordCount} words written
              </p>
            )}
            {session.skillType === 'speaking' && session.metrics.fluencyScore && (
              <p className="text-xs text-muted-foreground">
                Fluency: {Math.round(session.metrics.fluencyScore)}%
              </p>
            )}
          </div>
        )}
        
        {/* AI Insights Preview */}
        {session.aiInsights && session.aiInsights.strengths.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-1">Strengths:</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {session.aiInsights.strengths.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}