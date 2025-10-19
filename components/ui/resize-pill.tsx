import { cn } from "@/lib/utils"

interface ResizePillProps {
  side: "left" | "right"
}

export const ResizePill = ({ side }: ResizePillProps) => (
  <div 
    className={cn(
      "absolute top-1/2 -translate-y-1/2 h-20 w-1.5 rounded-full bg-primary/80 hover:bg-primary transition-colors z-50",
      side === "left" ? "right-0" : "left-0"
    )} 
  />
)