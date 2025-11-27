"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { SIDEBAR_COOKIE_NAME, SIDEBAR_COOKIE_MAX_AGE } from "@/lib/sidebar-constants"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  toggleSidebar: () => void
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
}

export const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

function readSidebarCookie(defaultOpen: boolean) {
  if (typeof document === "undefined") {
    return defaultOpen
  }

  const saved = document.cookie.match(new RegExp(`${SIDEBAR_COOKIE_NAME}=([^;]+)`))
  if (!saved) {
    return defaultOpen
  }

  return saved[1] === "true"
}

export function useSidebarState(
  defaultOpen: boolean,
  openProp?: boolean,
  setOpenProp?: (open: boolean) => void
) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(() => readSidebarCookie(defaultOpen))
  const open = openProp ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value

      if (setOpenProp) {
        setOpenProp(next)
      }

      if (openProp === undefined) {
        setUncontrolledOpen(next)
      }

      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    },
    [open, openProp, setOpenProp]
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current)
      return
    }

    setOpen((current) => !current)
  }, [isMobile, setOpen])

  const state = open ? "expanded" : "collapsed"

  return React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      toggleSidebar,
      isMobile,
      openMobile,
      setOpenMobile,
    }),
    [state, open, setOpen, toggleSidebar, isMobile, openMobile]
  )
}
