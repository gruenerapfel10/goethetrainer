"use client"

import type React from "react"

import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"

export function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
    >
      {children}
    </div>
  )
}
