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
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
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
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
    
    // Manage width independently for each sidebar
    const [sidebarWidth, setSidebarWidth] = React.useState(() => {
      if (typeof window !== 'undefined') {
        const cookieName = side === "left" ? "left_sidebar_width" : "right_sidebar_width"
        const saved = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`))
        if (saved) return parseInt(saved[1])
      }
      // Default widths
      return side === "left" ? 256 : 480
    })

    const handleWidthChange = React.useCallback((newWidth: number) => {
      setSidebarWidth(newWidth)
      const cookieName = side === "left" ? "left_sidebar_width" : "right_sidebar_width"
      document.cookie = `${cookieName}=${newWidth}; path=/; max-age=${60 * 60 * 24 * 7}`
    }, [side])

    // Mobile view - show as sheet
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

    // Desktop view - unified logic for both left and right sidebars
    const isCollapsed = collapsible !== "none" && state === "collapsed"
    const showResizePill = resizable && !isCollapsed

    return (
      <aside
        ref={ref}
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          SIDEBAR_TRANSITION,
          resizable && "relative",
          className
        )}
        style={{
          width: resizable 
            ? (isCollapsed ? "3rem" : `${sidebarWidth}px`)
            : (isCollapsed ? "var(--sidebar-width-icon)" : "var(--sidebar-width)")
        }}
        data-state={state}
        data-collapsible={isCollapsed ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        data-resizable={resizable}
        {...props}
      >
        {showResizePill && (
          <ResizePill 
            side={side}
            defaultWidth={sidebarWidth}
            onWidthChange={handleWidthChange}
            minWidth={200}
            maxWidth={side === "left" ? 400 : 600}
          />
        )}
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