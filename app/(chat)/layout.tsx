'use client'

import Script from 'next/script';
import { useState, useEffect } from 'react';
import { Search, Clock, Users, Bell, User, Plus, GraduationCap, LayoutDashboard, Settings, Sun, Moon, Monitor, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from '@/components/sidebar-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/firebase-auth-context';
import Image from 'next/image';
import { SearchModal } from '@/components/search-modal';
import { useTranslations } from 'next-intl';
import NavbarLanguageSwitcher from '@/components/navbar-language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const { user, logout } = useAuth()
  const { setTheme, theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultCount, setSearchResultCount] = useState<number | undefined>()
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const t = useTranslations()
  
  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true)
  }

  // Add keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <div className="min-h-screen bg-background">
        {/* L-Shaped Navigation Container */}
        <div className="fixed inset-0 flex">
          {/* Sidebar - Left part of L */}
          <div
            className={`${sidebarOpen ? "w-48" : "w-16"} bg-background flex flex-col transition-all duration-300 relative`}
          >
            {/* Logo/Brand */}
            <div className="p-4 flex items-center">
              <div className="flex items-center gap-2">
                {sidebarOpen ? (
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg opacity-0 blur-lg transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                    <Image
                      src="/mua-logo-horizontal-blue-bg.png"
                      alt="MUA Logo"
                      width={120}
                      height={32}
                      className="relative h-8 w-auto object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg opacity-0 blur-lg transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                    <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <span className="text-black font-bold text-sm">M</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search */}
            <div className={`${sidebarOpen ? "px-4" : "px-2"} pb-2`}>
              {sidebarOpen ? (
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-2 px-3 h-9 rounded-xl bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 transition-all duration-200 hover:bg-sidebar-accent/70">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <button
                      onClick={handleOpenSearchModal}
                      className="flex-1 bg-transparent outline-none text-sm text-left placeholder:text-muted-foreground/70 text-muted-foreground/70 flex items-center justify-between"
                    >
                      <span>{t('chat.search')}...</span>
                      <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted/50 font-mono opacity-70">{t('keyboard.shortcut')}</kbd>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleOpenSearchModal}
                  className="relative group transition-all duration-200 w-full h-9 rounded-xl flex items-center justify-center bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 hover:bg-sidebar-accent/70 hover:scale-105"
                >
                  <div className="absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200 relative z-10" />
                </button>
              )}
            </div>

            {/* Navigation Items */}
            <nav className={`flex-1 ${sidebarOpen ? "pl-1 pr-4" : "px-2"}`}>
              <div className="space-y-1">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className={`w-full gap-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
                      sidebarOpen ? "justify-start" : "justify-center px-0"
                    }`}
                    title={!sidebarOpen ? "Dashboard" : undefined}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {sidebarOpen && t('navigation.dashboard')}
                  </Button>
                </Link>
                <Link href="/universities">
                  <Button
                    variant="ghost"
                    className={`w-full gap-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
                      sidebarOpen ? "justify-start" : "justify-center px-0"
                    }`}
                    title={!sidebarOpen ? "Universities" : undefined}
                  >
                    <GraduationCap className="w-4 h-4" />
                    {sidebarOpen && t('navigation.universities')}
                  </Button>
                </Link>
              </div>
            </nav>

          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            <div className="h-16 bg-background flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <h1 className="text-sidebar-foreground font-medium">Dashboard</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <NavbarLanguageSwitcher />
                
                {/* Theme Toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                      <DropdownMenuRadioItem value="light" className="cursor-pointer">
                        <Sun className="w-4 h-4 mr-2" />
                        {t('sidebar.lightMode')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                        <Moon className="w-4 h-4 mr-2" />
                        {t('sidebar.darkMode')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system" className="cursor-pointer">
                        <Monitor className="w-4 h-4 mr-2" />
                        {t('sidebar.systemMode')}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile Avatar */}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-1">
                        <Image
                          src={`https://avatar.vercel.sh/${user.email}`}
                          alt={user.email ?? 'User Avatar'}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <div className="px-3 py-2">
                        <p className="text-sm text-popover-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer">
                        {t('navigation.profile')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => logout()}
                      >
                        {t('actions.signOut')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <User className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-0 bottom-4 right-4 bg-sidebar rounded-lg border border-border overflow-y-auto">
                {/* Sidebar Toggle inside content */}
                <div className="absolute top-4 left-4 z-50">
                  <SidebarToggle 
                    isOpen={sidebarOpen} 
                    onToggle={() => setSidebarOpen(!sidebarOpen)} 
                  />
                </div>
                <div className="pt-16 pl-4 pr-4 pb-4 min-h-full">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        chats={[]} // You can populate this with actual chat data
      />
    </>
  );
}