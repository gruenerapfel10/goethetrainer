"use client"

import * as React from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarContext, useSidebar, useSidebarState } from "./sidebar-context"
import { SIDEBAR_COOKIE_MAX_AGE } from "@/lib/sidebar-constants"

type SidebarVariant = "default" | "floating" | "inset"

const DEFAULT_EXPANDED_WIDTH: Record<"left" | "right", number> = {
  left: 160,
  right: 600,
}

const DEFAULT_COLLAPSED_ICON_WIDTH = 48
const MOBILE_DRAWER_WIDTH = 288

const RESIZE_MIN: Record<"left" | "right", number> = {
  left: 200,
  right: 200,
}

const RESIZE_MAX: Record<"left" | "right", number> = {
  left: 400,
  right: 600,
}

const WIDTH_COOKIE_NAME: Record<"left" | "right", string> = {
  left: "left_sidebar_width",
  right: "right_sidebar_width",
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type ResizeHandleProps = {
  side: "left" | "right"
  isDragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

function SidebarResizeHandle({ side, isDragging, onPointerDown }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-hidden="true"
      data-sidebar="resize-handle"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute top-0 bottom-0 z-40 flex w-4 cursor-col-resize touch-none select-none items-center justify-center",
        side === "left" ? "right-0" : "left-0"
      )}
    >
      <div
        className={cn(
          "h-20 w-1.5 rounded-full bg-primary/35 transition-transform transition-colors duration-200 ease-out",
          isDragging && "bg-primary scale-y-125 shadow-[0_0_0_1px_theme(colors.primary/60%)]"
        )}
      />
    </div>
  )
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const contextValue = useSidebarState(defaultOpen, openProp, setOpenProp)

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            style={style}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"aside"> & {
    side?: "left" | "right"
    variant?: SidebarVariant
    collapsible?: "icon" | "none"
    resizable?: boolean
    onOpenChange?: (open: boolean) => void
    open?: boolean
    width?: number
    collapsedWidth?: number
  }
>(
  (
    {
      side = "left",
      variant = "default",
      collapsible = "icon",
      resizable = false,
      open: openProp,
      width: widthProp,
      collapsedWidth: collapsedWidthProp,
      className,
      style,
      children,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const {
      isMobile,
      open: contextOpen,
      openMobile,
      setOpenMobile,
    } = useSidebar()

    const expandedWidth = widthProp ?? DEFAULT_EXPANDED_WIDTH[side]
    const collapsedWidth =
      collapsible === "icon"
        ? collapsedWidthProp ?? DEFAULT_COLLAPSED_ICON_WIDTH
        : 0
    const minWidth = RESIZE_MIN[side]
    const maxWidth = RESIZE_MAX[side]
    const widthCookie = WIDTH_COOKIE_NAME[side]

    const [dragWidth, setDragWidth] = React.useState(expandedWidth)

    const [isDragging, setIsDragging] = React.useState(false)
    const latestWidth = React.useRef(dragWidth)
    const cleanupRef = React.useRef<(() => void) | null>(null)

    React.useEffect(() => {
      latestWidth.current = dragWidth
    }, [dragWidth])

    React.useEffect(
      () => () => {
        cleanupRef.current?.()
      },
      []
    )

    const derivedOpen = openProp ?? contextOpen
    const isCollapsed = !derivedOpen
    const currentWidth = isCollapsed
      ? (collapsible === "none" ? 0 : collapsedWidth)
      : resizable
        ? dragWidth
        : expandedWidth

    const handlePointerDown = React.useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (!resizable || isCollapsed) {
          return
        }

        event.preventDefault()
        event.stopPropagation()

        const pointerId = event.pointerId
        const handleElement = event.currentTarget
        handleElement.setPointerCapture?.(pointerId)

        const startX = event.clientX
        const startWidth = dragWidth

        cleanupRef.current?.()

        const onPointerMove = (moveEvent: PointerEvent) => {
          const delta = moveEvent.clientX - startX
          const nextWidth =
            side === "left"
              ? clamp(startWidth + delta, minWidth, maxWidth)
              : clamp(startWidth - delta, minWidth, maxWidth)

          setDragWidth(nextWidth)
          latestWidth.current = nextWidth
        }

        const stopDragging = () => {
          document.removeEventListener("pointermove", onPointerMove)
          document.removeEventListener("pointerup", onPointerUp)
          document.removeEventListener("pointercancel", onPointerUp)
          document.body.style.cursor = ""
          document.body.style.userSelect = ""
          if (handleElement.hasPointerCapture?.(pointerId)) {
            try {
              handleElement.releasePointerCapture(pointerId)
            } catch {
              // Ignore if the pointer is already released
            }
          }
          cleanupRef.current = null
        }

        const onPointerUp = () => {
          setIsDragging(false)
          stopDragging()

          const finalWidth = clamp(Math.round(latestWidth.current), minWidth, maxWidth)
          latestWidth.current = finalWidth
          setDragWidth(finalWidth)

          if (typeof document !== "undefined") {
            document.cookie = `${widthCookie}=${finalWidth}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
          }
        }

        cleanupRef.current = stopDragging

        setIsDragging(true)
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
        document.addEventListener("pointermove", onPointerMove)
        document.addEventListener("pointerup", onPointerUp)
        document.addEventListener("pointercancel", onPointerUp)
      },
      [dragWidth, isCollapsed, maxWidth, minWidth, resizable, side, widthCookie]
    )

    React.useEffect(() => {
      if (!resizable || typeof document === "undefined") {
        return
      }

      const match = document.cookie.match(new RegExp(`${widthCookie}=([^;]+)`))
      if (match) {
        const parsed = Number.parseInt(match[1], 10)
        if (!Number.isNaN(parsed)) {
          setDragWidth(clamp(parsed, minWidth, maxWidth))
        }
      } else {
        setDragWidth((value) => clamp(value, minWidth, maxWidth))
      }
    }, [maxWidth, minWidth, resizable, widthCookie])

    const [isHydrated, setIsHydrated] = React.useState(false)
    React.useEffect(() => setIsHydrated(true), [])

    const mobileOpen = openProp ?? openMobile
    const handleMobileOpenChange = React.useCallback(
      (open: boolean) => {
        onOpenChange?.(open)
        if (openProp === undefined) {
          setOpenMobile(open)
        }
      },
      [onOpenChange, openProp, setOpenMobile]
    )

    if (isMobile) {
      return (
        <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange} {...props}>
          <SheetContent
            side={side}
            data-sidebar="sidebar"
            data-mobile="true"
            className="bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={{ width: `${MOBILE_DRAWER_WIDTH}px` }}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div ref={ref} className="flex h-full w-full flex-col">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      )
    }

    const computedStyle: React.CSSProperties = {
      ...style,
      width: isHydrated ? `${currentWidth}px` : undefined,
      minWidth:
        collapsible === "none" && isCollapsed
          ? 0
          : isHydrated
            ? `${currentWidth}px`
            : undefined,
    }

    return (
      <aside
        ref={ref}
        className={cn(
          "group/sidebar relative flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-sidebar text-sidebar-foreground",
          isDragging
            ? "select-none"
            : "transition-[min-width,width] duration-300 ease-out",
          className
        )}
        style={computedStyle}
        data-state={derivedOpen ? "expanded" : "collapsed"}
        data-collapsed={isCollapsed ? "true" : "false"}
        data-variant={variant}
        data-side={side}
        data-resizable={resizable ? "true" : "false"}
        {...props}
      >
        {resizable && !isCollapsed ? (
          <>
            <SidebarResizeHandle
              side={side}
              isDragging={isDragging}
              onPointerDown={handlePointerDown}
            />
            {isDragging ? (
              <div
                aria-hidden="true"
                className="fixed inset-0 z-30 cursor-col-resize"
              />
            ) : null}
          </>
        ) : null}
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

export const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(() => {
  return null
})
SidebarRail.displayName = "SidebarRail"
