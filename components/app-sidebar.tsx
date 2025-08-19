'use client'

import { useState, useEffect, useTransition } from 'react';
import { Search, LayoutDashboard, GraduationCap, Sun, Moon, Monitor, User, Languages, ChevronDown, Award, Target, Settings, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from '@/components/sidebar-toggle';
import { AppRightSidebar } from '@/components/app-right-sidebar';
import { MuaLogoVertical } from '@/airdrop3/components/mua-logo-vertical';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/firebase-auth-context';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { setUserLocale } from '@/services/locale';
import type { Locale } from '@/i18n/config';
import NationalitySwitcher from '@/components/nationality-switcher';
import DegreeSwitcher, { DegreeInfo } from '@/components/degree-switcher';
import { Breadcrumb } from '@/components/breadcrumb';
import { profileService, type StarredUniversity } from '@/lib/firebase/profile-service';
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
  const [starredUniversities, setStarredUniversities] = useState<StarredUniversity[]>([])
  const [optimisticStarredUniversities, setOptimisticStarredUniversities] = useState<StarredUniversity[]>([])
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
    // Save language preference to Firebase
    if (user?.uid) {
      profileService.saveLanguage(user.uid, value)
        .catch(err => console.error('Failed to save language preference:', err))
    }
  }

  const handleNationalityChange = (value: string) => {
    setNationality(value)
    // Save nationality preference to Firebase
    if (user?.uid) {
      profileService.saveNationality(user.uid, value)
        .catch(err => console.error('Failed to save nationality preference:', err))
    }
    
    // If we're on a job detail page, update the URL with the new nationality
    if (pathname.startsWith('/jobs/')) {
      const url = new URL(window.location.href)
      url.searchParams.set('nationality', value)
      window.history.pushState({}, '', url.toString())
      // Trigger a custom event to notify the job page
      window.dispatchEvent(new CustomEvent('nationalityChanged', { detail: value }))
    }
  }

  const handleDegreeChange = (value: DegreeInfo) => {
    setDegree(value)
    // Save degree preference to Firebase
    if (user?.uid) {
      profileService.saveDegree(user.uid, value)
        .catch(err => console.error('Failed to save degree preference:', err))
    }
  }

  // Load user preferences from Firebase when user is available
  useEffect(() => {
    if (user?.uid) {
      profileService.getProfile(user.uid)
        .then(profile => {
          if (profile) {
            if (profile.nationality) {
              setNationality(profile.nationality)
            }
            if (profile.language && profile.language !== locale) {
              // Only update locale if different from saved language
              startTransition(() => {
                setUserLocale(profile.language as Locale)
              })
            }
            if (profile.degree) {
              setDegree(profile.degree)
            }
            if (profile.starredUniversities) {
              setStarredUniversities(profile.starredUniversities)
              setOptimisticStarredUniversities(profile.starredUniversities)
            }
          }
        })
        .catch(err => console.error('Failed to load user preferences:', err))
    }
  }, [user?.uid, locale])

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

  // Listen for starred university changes from other components
  useEffect(() => {
    const handleStarredUniversityUpdate = (event: CustomEvent) => {
      const { action, university } = event.detail
      
      if (action === 'star') {
        const newStarred: StarredUniversity = {
          ...university,
          starredAt: Date.now()
        }
        setOptimisticStarredUniversities(prev => {
          const isAlreadyStarred = prev.some(starred => starred.id === university.id)
          if (!isAlreadyStarred) {
            return [...prev, newStarred]
          }
          return prev
        })
      } else if (action === 'unstar') {
        setOptimisticStarredUniversities(prev => 
          prev.filter(starred => starred.id !== university.id)
        )
      }
    }

    window.addEventListener('starredUniversityUpdate', handleStarredUniversityUpdate as EventListener)
    return () => {
      window.removeEventListener('starredUniversityUpdate', handleStarredUniversityUpdate as EventListener)
    }
  }, [])

  // Helper function to get university emblem path
  const getUniversityEmblemPath = (name: string) => {
    const path = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '')
    return `/university-images/${path}/emblem_${path}.svg`
  }

  // Effect to fetch job data when on job detail page
  useEffect(() => {
    const universityMatch = pathname.match(/^\/jobs\/([^\/]+)$/)
    if (universityMatch) {
      const universityId = universityMatch[1]
      // Fetch from individual university JSON file
      fetch(`/${universityId}.json`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`University file not found: ${universityId}.json`)
          }
          return res.json()
        })
        .then(university => {
          if (university && university.name) {
            setUniversityData({ id: universityId, name: university.name })
          }
        })
        .catch(err => {
          console.error('Failed to load university data:', err)
          setUniversityData(null)
        })
    } else {
      setUniversityData(null)
    }
  }, [pathname])

  // Helper function to truncate university names for breadcrumb
  const truncateUniversityName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  // Generate breadcrumb items based on current path
  const getBreadcrumbItems = () => {
    if (pathname === '/dashboard') {
      return [{ label: t('navigation.dashboard'), current: true }]
    } else if (pathname === '/jobs') {
      return [{ label: 'Jobs', current: true }]
    } else if (pathname === '/profile') {
      return [{ label: t('navigation.profile'), current: true }]
    } else if (pathname === '/applications') {
      return [{ label: 'Applications', current: true }]
    } else if (pathname.startsWith('/jobs/') && universityData) {
      return [
        { label: 'Jobs', href: '/jobs' },
        { label: truncateUniversityName(universityData.name), current: true }
      ]
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
                  <div className="relative w-8 h-8 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <MuaLogoVertical className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className={`${sidebarOpen ? "px-4" : "px-2"} pb-6`}>
            {sidebarOpen ? (
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                <div className="relative flex items-center gap-2 px-3 h-9 rounded-xl bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 transition-all duration-200 hover:bg-sidebar-accent/70">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={onOpenSearchModal}
                    className="flex-1 bg-transparent outline-none text-sm text-left placeholder:text-muted-foreground/70 text-muted-foreground/70 flex items-center justify-between"
                  >
                    <span>{t('chat.search')}...</span>
                    <kbd className="px-1.5 py-0.5 text-xs rounded bg-muted/50 font-mono opacity-70">{t('keyboard.shortcut')}</kbd>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenSearchModal}
                className="relative group transition-all duration-200 w-full h-9 rounded-xl flex items-center justify-center bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 hover:bg-sidebar-accent/70 hover:scale-105"
              >
                <div className="absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-blue-500/30 to-blue-400/20 group-hover:opacity-100" />
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200 relative z-10" />
              </button>
            )}
          </div>

          {/* Starred Universities */}
          {user && optimisticStarredUniversities.length > 0 && (
            <div className={`${sidebarOpen ? "px-4" : "px-2"} pb-2`}>
              {sidebarOpen ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground/70 px-2 pb-1 font-medium tracking-wide uppercase">
                    {t('sidebar.starredUniversities')}
                  </div>
                  {optimisticStarredUniversities.slice(0, 3).map((university) => (
                    <Link key={university.id} href={`/jobs/${university.id}`}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                        <Image
                          src={getUniversityEmblemPath(university.name)}
                          alt={`${university.name} emblem`}
                          width={12}
                          height={12}
                          className="flex-shrink-0 rounded-sm"
                          onError={(e) => {
                            // Fallback to star icon if emblem fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const starIcon = target.nextElementSibling as HTMLElement
                            if (starIcon) starIcon.style.display = 'block'
                          }}
                        />
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 flex-shrink-0" style={{display: 'none'}} />
                        <span className="truncate text-xs">{university.name}</span>
                      </div>
                    </Link>
                  ))}
                  {optimisticStarredUniversities.length > 3 && (
                    <Link href="/jobs?tab=starred">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                        <span className="truncate">+{optimisticStarredUniversities.length - 3} more</span>
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {optimisticStarredUniversities.slice(0, 2).map((university) => (
                    <Link key={university.id} href={`/jobs/${university.id}`}>
                      <button
                        className="relative group transition-all duration-200 w-full h-8 rounded-lg flex items-center justify-center bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border/50 hover:bg-sidebar-accent/70"
                        title={university.name}
                      >
                        <Image
                          src={getUniversityEmblemPath(university.name)}
                          alt={`${university.name} emblem`}
                          width={16}
                          height={16}
                          className="rounded-sm"
                          onError={(e) => {
                            // Fallback to star icon if emblem fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const starIcon = target.nextElementSibling as HTMLElement
                            if (starIcon) starIcon.style.display = 'block'
                          }}
                        />
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" style={{display: 'none'}} />
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav className={`flex-1 ${sidebarOpen ? "pl-1 pr-4" : "px-2"}`}>
            <div className="space-y-1">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/dashboard' 
                      ? 'bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-blue-400/20 text-blue-600 font-medium border border-blue-500/30 backdrop-blur-sm' 
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
              <Link href="/jobs">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/jobs' 
                      ? 'bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-blue-400/20 text-blue-600 font-medium border border-blue-500/30 backdrop-blur-sm' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Jobs" : undefined}
                >
                  <GraduationCap className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">Jobs</span>}
                </Button>
              </Link>
              <Link href="/profile">
                <Button
                  variant="ghost"
                  className={`w-full gap-3 transition-all duration-200 ${
                    pathname === '/profile' 
                      ? 'bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-blue-400/20 text-blue-600 font-medium border border-blue-500/30 backdrop-blur-sm' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  } ${
                    sidebarOpen ? "justify-start" : "justify-center px-0"
                  }`}
                  title={!sidebarOpen ? "Profile" : undefined}
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{t('navigation.profile')}</span>}
                </Button>
              </Link>
              <div className={sidebarOpen ? "pl-1 pr-4" : "px-2"}>
                <SidebarToggle 
                  isOpen={sidebarOpen} 
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  showText={sidebarOpen}
                />
              </div>
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
              {/* Degree Switcher */}
              <DegreeSwitcher 
                value={degree} 
                onChange={handleDegreeChange}
                variant="sidebar"
              />
              
              {/* Nationality Switcher */}
              <NationalitySwitcher 
                value={nationality} 
                onChange={handleNationalityChange}
                variant="sidebar"
              />
              
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
                    <span className="text-lg">{currentLanguageItem?.emoji}</span>
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
                      <span className="text-lg mr-2">{item.emoji}</span>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
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

          <div className="flex-1 relative flex">
            <div className={`flex-1 relative ${rightSidebarOpen ? "lg:mr-4" : ""}`}>
              <div className="absolute inset-0 bottom-4 right-0 bg-sidebar rounded-lg border border-border overflow-auto">
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