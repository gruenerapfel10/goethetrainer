'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Target, Clock, TrendingUp, Calendar, Award } from 'lucide-react'
import { sessionService, type UserProgress, type SkillType } from '@/lib/firebase/session-service'
import { useAuth } from '@/context/firebase-auth-context'
import { Skeleton } from '@/components/ui/skeleton'

interface ProgressStatsProps {
  skillType: SkillType
}

export function ProgressStats({ skillType }: ProgressStatsProps) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return

      try {
        setLoading(true)
        const userProgress = await sessionService.getUserProgress(user.uid, skillType)
        setProgress(userProgress)
      } catch (error) {
        console.error('Failed to load progress:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [user, skillType])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!progress) {
    return null
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const weeklyProgressPercentage = (progress.weeklyProgress / progress.weeklyGoal) * 100

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Level</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.currentLevel}</div>
            <p className="text-xs text-muted-foreground">
              Next: {getNextLevel(progress.currentLevel)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progress.averageScore)}</div>
            <p className="text-xs text-muted-foreground">
              Best: {Math.round(progress.bestScore)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(progress.totalTime)}</div>
            <p className="text-xs text-muted-foreground">
              {progress.totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.streak} days</div>
            <p className="text-xs text-muted-foreground">
              Longest: {progress.longestStreak} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weekly Goal Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {progress.weeklyProgress} of {progress.weeklyGoal} sessions
            </span>
            <span className="text-sm font-medium">
              {Math.round(weeklyProgressPercentage)}%
            </span>
          </div>
          <Progress value={weeklyProgressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.entries(progress.levelProgress).map(([level, data]) => (
              <div
                key={level}
                className="flex flex-col items-center p-2 rounded-lg border"
              >
                <Badge
                  variant={data.completed ? 'default' : 'outline'}
                  className="mb-2"
                >
                  {level}
                </Badge>
                <span className="text-xs font-medium">{data.sessions}</span>
                <span className="text-xs text-muted-foreground">sessions</span>
                {data.completed && (
                  <Trophy className="h-3 w-3 text-yellow-500 mt-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">
                {Math.round(progress.statistics.averageAccuracy)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Improvement</p>
              <p className="text-2xl font-bold flex items-center gap-1">
                {progress.statistics.improvementRate > 0 && '+'}
                {Math.round(progress.statistics.improvementRate)}%
                <TrendingUp className="h-4 w-4 text-green-500" />
              </p>
            </div>
            {(skillType === 'reading' || skillType === 'writing') && (
              <div>
                <p className="text-sm text-muted-foreground">Vocabulary</p>
                <p className="text-2xl font-bold">
                  {progress.statistics.vocabularyMastered}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Grammar Points</p>
              <p className="text-2xl font-bold">
                {progress.statistics.grammarPointsMastered}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getNextLevel(currentLevel: string): string {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const currentIndex = levels.indexOf(currentLevel)
  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return 'Max'
  }
  return levels[currentIndex + 1]
}