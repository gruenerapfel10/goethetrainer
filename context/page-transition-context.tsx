'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface TransitionContextType {
  isTransitioning: boolean
  transitionData: any
  startTransition: (href: string, data?: any) => void
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined)

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionData, setTransitionData] = useState<any>(null)
  const router = useRouter()

  const startTransition = useCallback((href: string, data?: any) => {
    setTransitionData(data)
    setIsTransitioning(true)
    
    // Delay navigation to show exit animation
    setTimeout(() => {
      router.push(href)
      // Reset transition state after navigation
      setTimeout(() => {
        setIsTransitioning(false)
        setTransitionData(null)
      }, 300)
    }, 400)
  }, [router])

  return (
    <TransitionContext.Provider value={{ isTransitioning, transitionData, startTransition }}>
      {children}
    </TransitionContext.Provider>
  )
}

export const usePageTransition = () => {
  const context = useContext(TransitionContext)
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider')
  }
  return context
}