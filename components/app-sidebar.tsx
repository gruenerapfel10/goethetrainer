'use client'

import { useState, useEffect, useTransition } from 'react';
import { Search, LayoutDashboard, BookOpen, PenTool, Headphones, Mic, Sun, Moon, Monitor, User, Languages, ChevronDown, Award, Target, Settings, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from '@/components/sidebar-toggle';
import { AppRightSidebar } from '@/components/app-right-sidebar';
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/firebase-auth-context';
import { useTranslations, useLocale } from 'next-intl';
import { setUserLocale } from '@/services/locale';
import type { Locale } from '@/i18n/config';
import NationalitySwitcher from '@/components/nationality-switcher';
import DegreeSwitcher, { DegreeInfo } from '@/components/degree-switcher';
import { Breadcrumb } from '@/components/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

interface AppSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onOpenSearchModal: () => void;
  children: React.ReactNode;
}

export function AppSidebar({ sidebarOpen, setSidebarOpen, onOpenSearchModal, children }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const { setTheme, theme } = useTheme()
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [nationality, setNationality] = useState('us')
  const [degree, setDegree] = useState<DegreeInfo>({
    level: 'undergraduate',
    field: 'mechanical-engineering',
    displayName: 'Undergraduate Mechanical Engineering'
  })
  const [universityData, setUniversityData] = useState<{id: string, name: string} | null>(null)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  const languageItems = [
    { value: 'en', label: t('locales.en'), emoji: '🇺🇸' },
    { value: 'lt', label: t('locales.lt'), emoji: '🇱🇹' },
    { value: 'ru', label: t('locales.ru'), emoji: '🇷🇺' },
  ]

  const currentLanguageItem = languageItems.find((item) => item.value === locale)
  const currentLanguage = currentLanguageItem?.label

  const handleLanguageChange = (value: string) => {
    const newLocale = value as Locale
    startTransition(() => {
      setUserLocale(newLocale)
    })
  }

  const handleNationalityChange = (value: string) => {
    setNationality(value)
  }

  const handleDegreeChange = (value: DegreeInfo) => {
    setDegree(value)
  }


  // Add keyboard shortcuts for right sidebar toggle (Cmd/Ctrl + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setRightSidebarOpen(!rightSidebarOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rightSidebarOpen, setRightSidebarOpen])



  // Generate breadcrumb items based on current path
  const getBreadcrumbItems = () => {
    if (pathname === '/dashboard') {
      return [{ label: t('navigation.dashboard'), current: true }]
    } else if (pathname === '/reading') {
      return [{ label: 'Reading', current: true }]
    } else if (pathname === '/writing') {
      return [{ label: 'Writing', current: true }]
    } else if (pathname === '/listening') {
      return [{ label: 'Listening', current: true }]
    } else if (pathname === '/speaking') {
      return [{ label: 'Speaking', current: true }]
    } else if (pathname === '/applications') {
      return [{ label: 'Applications', current: true }]
    } else if (pathname.startsWith('/chat/')) {
      return [{ label: 'Chat', current: true }]
    } else if (pathname === '/admin') {
      return [{ label: 'Admin', current: true }]
    }
    
    // Default fallback
    return [{ label: 'Home', current: true }]
  }


  return (
    <div className="min-h-screen bg-background">
      {/* L-Shaped Navigation Container */}
      <div className="fixed inset-0 flex">
        {/* Sidebar - Left part of L */}
        <div
          className={`${sidebarOpen ? "w-56" : "w-16"} bg-background flex flex-col transition-all duration-300 relative`}
        >
          {/* Logo/Brand */}
          <div className="p-4 flex items-center justify-between">
            {sidebarOpen ? (
              <>
                <span className="text-2xl font-bold text-foreground">Goethe</span>
                <SidebarToggle 
                  isOpen={sidebarOpen} 
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  showText={false}
                  className="h-8 w-8"
                />
              </>
            ) : (
              <span className="text-2xl font-bold text-foreground w-full text-center">G</span>
            )}
          </div>

          {/* Search */}
          <div className={`${sidebarOpen ? "px-2" : "px-2"} pb-1`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 transition-all duration-200 hover:bg-sidebar-accent/70">
                <Search className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={onOpenSearchModal}
                  className="flex-1 bg-transparent outline-none text-sm text-left placeholder:text-muted-foreground/70 text-muted-foreground/70 flex items-center justify-between"
                >
                  <span>{t('chat.search')}...</span>
                  <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted/50 font-mono opacity-70">{t('keyboard.shortcut')}</kbd>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSearchModal}
                className="transition-all duration-200 w-full h-9 rounded-xl flex items-center justify-center bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 hover:bg-sidebar-accent/70 hover:scale-105"
              >
                <Search className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
              </button>
            )}
          </div>


          {/* Navigation Items */}
          <nav className={`flex-1 ${sidebarOpen ? "pl-1 pr-4" : "px-2"} flex flex-col`}>
            <div className="space-y-1 flex-1">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/dashboard' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Dashboard" : undefined}
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{t('navigation.dashboard')}</span>}
                </Button>
              </Link>
              <Link href="/reading">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/reading' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Reading" : undefined}
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">Reading</span>}
                </Button>
              </Link>
              <Link href="/writing">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/writing' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Writing" : undefined}
                >
                  <PenTool className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">Writing</span>}
                </Button>
              </Link>
              <Link href="/listening">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/listening' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Listening" : undefined}
                >
                  <Headphones className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">Listening</span>}
                </Button>
              </Link>
              <Link href="/speaking">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/speaking' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Speaking" : undefined}
                >
                  <Mic className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">Speaking</span>}
                </Button>
              </Link>
              
              {/* Sidebar toggle after speaking when collapsed */}
              {!sidebarOpen && (
                <SidebarToggle 
                  isOpen={sidebarOpen} 
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  showText={false}
                />
              )}
            </div>
          </nav>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-background flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 px-3 gap-2"
                    disabled={isPending}
                  >
                    <Languages className="h-4 w-4" />
                    <span className="text-sm font-medium">{currentLanguage}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border/30 rounded-xl bg-muted">
                  {languageItems.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => handleLanguageChange(item.value)}
                      className={`cursor-pointer text-sm font-medium ${
                        locale === item.value 
                          ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" 
                          : "hover:bg-accent"
                      }`}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 w-8 px-0"
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border/30 rounded-xl bg-muted">
                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Right Sidebar Toggle */}
              <RightSidebarToggle 
                isOpen={rightSidebarOpen} 
                onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
                showText={false}
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 w-8"
              />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative">
              <div className="absolute inset-0 bottom-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-lg border-0 overflow-auto">
                <div className="min-h-full">
                  {children}
                </div>
              </div>
            </div>
            
            {/* Right Sidebar */}
            <AppRightSidebar 
              rightSidebarOpen={rightSidebarOpen}
              setRightSidebarOpen={setRightSidebarOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}