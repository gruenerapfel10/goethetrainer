"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MuaLogo } from "@/components/mua-logo"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LayoutDashboard, FileText, Folder, User, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/universities", icon: Folder, label: "Universities" },
  { href: "/dashboard/documents", icon: FileText, label: "Documents" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <aside className="sticky top-0 flex h-screen w-16 flex-col items-center border-r border-white/10 bg-gray-900/50 py-6">
        <Link href="/dashboard">
          <MuaLogo className="h-8 w-auto text-white" />
        </Link>
        <nav className="mt-12 flex flex-1 flex-col items-center gap-4">
          {navItems.map((item) => (
            <Tooltip key={item.label} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-lg transition-colors",
                      pathname === item.href
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <div className="mt-auto">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-800 hover:text-white">
                  <LogOut className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
