"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function PlanToggle() {
  const [isAnnual, setIsAnnual] = useState(true)

  return (
    <div className="relative flex w-fit items-center rounded-full bg-zinc-900/80 p-1 backdrop-blur-sm">
      <button
        onClick={() => setIsAnnual(false)}
        className={cn(
          "relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors",
          !isAnnual ? "text-white" : "text-zinc-400",
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => setIsAnnual(true)}
        className={cn(
          "relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors",
          isAnnual ? "text-white" : "text-zinc-400",
        )}
      >
        Annual
      </button>
      <div
        className={cn(
          "absolute top-1 h-[calc(100%-8px)] rounded-full bg-blue-600 transition-all duration-300 ease-in-out",
          isAnnual ? "left-[calc(50%-2px)] w-[calc(50%-2px)]" : "left-1 w-[calc(50%-2px)]",
        )}
      />
      <div className="absolute -right-4 -top-3 -rotate-12">
        <div className="relative rounded-md bg-blue-500 px-2 py-1 text-xs font-bold uppercase text-white shadow-lg">
          Save 20%
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-blue-500" />
        </div>
      </div>
    </div>
  )
}