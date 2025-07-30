"use client"

import { Globe } from 'lucide-react'

export function LoadingIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Globe className="w-16 h-16 text-primary animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Loading Globe</h3>
          <p className="text-sm text-muted-foreground">Preparing your world view...</p>
        </div>
      </div>
    </div>
  )
} 