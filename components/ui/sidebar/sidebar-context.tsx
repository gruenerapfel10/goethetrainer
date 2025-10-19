"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { SIDEBAR_COOKIE_NAME, SIDEBAR_COOKIE_MAX_AGE } from "@/lib/sidebar-constants"

export { SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX, SIDEBAR_WIDTH_DEFAULT }

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  width: number
  setWidth: (width: number) => void
  isResizing: boolean
  setIsResizing: (resizing: boolean) => void
}

export const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

const SIDEBAR_WIDTH_DEFAULT = 160
const SIDEBAR_WIDTH_MIN = 140
const SIDEBAR_WIDTH_MAX = 400
const SIDEBAR_WIDTH_COOKIE = 'sidebar_width'

export function useSidebarState(defaultOpen: boolean, openProp?: boolean, setOpenProp?: (open: boolean) => void) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const [width, setWidthState] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = document.cookie.match(new RegExp(`${SIDEBAR_WIDTH_COOKIE}=([^;]+)`))
      return saved ? parseInt(saved[1]) : SIDEBAR_WIDTH_DEFAULT
    }
    return SIDEBAR_WIDTH_DEFAULT
  })
  const [isResizing, setIsResizing] = React.useState(false)
  
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const setWidth = React.useCallback((newWidth: number) => {
    const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_WIDTH_MIN), SIDEBAR_WIDTH_MAX)
    setWidthState(clampedWidth)
    document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${clampedWidth}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }, [])

  const toggleSidebar = React.useCallback(() => {
    return isMobile
      ? setOpenMobile((open) => !open)
      : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  const state = open ? "expanded" : "collapsed"

  return React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      width,
      setWidth,
      isResizing,
      setIsResizing,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, width, setWidth, isResizing]
  )
}