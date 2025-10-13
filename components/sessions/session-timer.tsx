'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Pause, StopCircle } from 'lucide-react'

interface SessionTimerProps {
  isActive: boolean
  isPaused: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export function SessionTimer({
  isActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
}: SessionTimerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds + 1)
      }, 1000)
    } else if (interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, isPaused])

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    const pad = (num: number) => num.toString().padStart(2, '0')

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    }
    return `${pad(minutes)}:${pad(secs)}`
  }, [])

  const handleReset = () => {
    setSeconds(0)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-mono font-bold">
            {formatTime(seconds)}
          </div>
          
          <div className="flex items-center gap-2">
            {!isActive ? (
              <Button
                size="sm"
                onClick={() => {
                  handleReset()
                  onStart()
                }}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start Session
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    size="sm"
                    onClick={onResume}
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={onPause}
                    variant="outline"
                    className="gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    onStop()
                    handleReset()
                  }}
                  variant="destructive"
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>
        
        {isActive && (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
            <span className="text-sm text-muted-foreground">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}