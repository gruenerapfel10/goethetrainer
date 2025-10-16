"use client"

export function FileSearchSkeleton() {
  return (
    <div className="py-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="py-2 px-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-muted/50 animate-pulse" />
          <div className="flex-1 flex items-center gap-3">
            <div className="h-3 bg-muted/50 rounded-sm animate-pulse w-[140px]" />
            <div className="h-2.5 bg-muted/30 rounded-sm animate-pulse w-[60px]" />
          </div>
        </div>
      ))}
    </div>
  )
}