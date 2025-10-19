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
import { ResizePill } from "@/components/ui/resize-pill"
import { SidebarContext, useSidebar, useSidebarState } from "./sidebar-context"
import { 
  SIDEBAR_WIDTH, 
  SIDEBAR_WIDTH_ICON, 
  SIDEBAR_BASE_CLASSES, 
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_KEYBOARD_SHORTCUT
} from "@/lib/sidebar-constants"

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
    keyboardShortcut?: string
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
      keyboardShortcut = SIDEBAR_KEYBOARD_SHORTCUT,
      ...props
    },
    ref
  ) => {
    const contextValue = useSidebarState(defaultOpen, openProp, setOpenProp)

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": `${contextValue.width}px`,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              contextValue.isResizing && "select-none",
              className
            )}
            ref={ref}
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
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
    resizable?: boolean
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      resizable = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile, width: contextWidth, setWidth: contextSetWidth, isResizing: contextIsResizing } = useSidebar()
    
    // For right sidebar or when not using context, manage local state
    const [localWidth, setLocalWidth] = React.useState(() => {
      if (side === "right" && typeof window !== 'undefined') {
        const saved = document.cookie.match(/right_sidebar_width=([^;]+)/)
        return saved ? parseInt(saved[1]) : 480
      }
      return 256
    })
    const [localIsResizing, setLocalIsResizing] = React.useState(false)
    
    // Use context for left sidebar, local state for right
    const width = side === "left" ? contextWidth : localWidth
    const setWidth = React.useCallback((newWidth: number) => {
      if (side === "left") {
        contextSetWidth(newWidth)
      } else {
        setLocalWidth(newWidth)
        document.cookie = `right_sidebar_width=${newWidth}; path=/; max-age=${60 * 60 * 24 * 7}`
      }
    }, [side, contextSetWidth])
    const isResizing = side === "left" ? contextIsResizing : localIsResizing

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
            resizable && "relative",
            className
          )}
          ref={ref}
          {...props}
        >
          {resizable && (
            <ResizePill 
              side={side} 
              currentWidth={width}
              onResize={setWidth}
              minWidth={200}
              maxWidth={side === "left" ? 400 : 600}
            />
          )}
          {children}
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <aside
        ref={ref}
        className={cn(
          SIDEBAR_BASE_CLASSES, 
          !isResizing && SIDEBAR_TRANSITION, 
          state === "collapsed" ? "w-[--sidebar-width-icon]" : "w-[--sidebar-width]", 
          resizable && "relative",
          isResizing && "transition-none"
        )}
        style={{
          width: state === "collapsed" ? undefined : `${width}px`,
        }}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        data-resizable={resizable}
      >
        {resizable && <ResizePill side={side} />}
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
  return null // Remove the rail completely
})
SidebarRail.displayName = "SidebarRail"