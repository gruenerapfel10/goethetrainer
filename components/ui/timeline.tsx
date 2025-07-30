import * as React from "react"
import { cn } from "@/lib/utils"

// Timeline container
const Timeline = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("relative", className)} {...props} />,
)
Timeline.displayName = "Timeline"

// Timeline item
const TimelineItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("relative pl-8", className)} {...props} />,
)
TimelineItem.displayName = "TimelineItem"

// Timeline icon container
const TimelineIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    topPosition?: "top-4" | "top-1"
  }
>(({ className, topPosition = "top-4", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background z-10",
      topPosition,
      className,
    )}
    {...props}
  />
))
TimelineIcon.displayName = "TimelineIcon"

// Timeline connector (the line)
const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    running?: boolean
    pending?: boolean
    showGradient?: boolean
    topPosition?: "top-4" | "top-1"
  }
>(({ className, active, running, pending, showGradient, topPosition = "top-4", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-4 -translate-x-1/2 w-px",
      // Extend the line to reach the next icon
      "h-[calc(100%)]",
      // Apply the appropriate background color based on state
      // Only use special styling for the gradient line, otherwise use regular colors
      active ? "bg-primary" : pending ? "bg-primary/30" : "bg-primary",
      // Remove background when showing gradient
      showGradient && "bg-transparent",
      topPosition,
      className,
    )}
    {...props}
  >
    {showGradient && (
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div
          className="absolute inset-0 w-full h-[200%] animate-flow-up"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--primary)) 45%, hsl(var(--background)) 55%, hsl(var(--primary)) 100%)",
            backgroundSize: "100% 200%",
            boxShadow: "0 0 8px 1px hsl(var(--primary) / 0.5)",
          }}
        />
      </div>
    )}
  </div>
))
TimelineConnector.displayName = "TimelineConnector"

// Timeline content
const TimelineContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("pt-1", className)} {...props} />,
)
TimelineContent.displayName = "TimelineContent"

// Timeline title
const TimelineTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn("font-medium leading-none", className)} {...props} />,
)
TimelineTitle.displayName = "TimelineTitle"

// Timeline description
const TimelineDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
)
TimelineDescription.displayName = "TimelineDescription"

export { Timeline, TimelineItem, TimelineIcon, TimelineConnector, TimelineContent, TimelineTitle, TimelineDescription }
