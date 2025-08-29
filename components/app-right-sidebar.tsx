'use client'

import { useState, useEffect } from 'react';
import { Settings, Bell, HelpCircle, Bookmark, Activity, Calendar, Users, Filter, Star, Target, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/firebase-auth-context';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { profileService, type StarredUniversity } from '@/lib/firebase/profile-service';

interface AppRightSidebarProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function AppRightSidebar({ rightSidebarOpen, setRightSidebarOpen }: AppRightSidebarProps) {
  const { user } = useAuth()
  const t = useTranslations()
  const pathname = usePathname()
  const [starredUniversities, setStarredUniversities] = useState<StarredUniversity[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Load user data when component mounts
  useEffect(() => {
    if (user?.uid) {
      profileService.getProfile(user.uid)
        .then(profile => {
          if (profile) {
            if (profile.starredUniversities) {
              setStarredUniversities(profile.starredUniversities)
            }
          }
        })
        .catch(err => console.error('Failed to load user preferences:', err))
    }
  }, [user?.uid])

  // Listen for starred university changes from other components
  useEffect(() => {
    const handleStarredUniversityUpdate = (event: CustomEvent) => {
      const { action, university } = event.detail
      
      if (action === 'star') {
        const newStarred: StarredUniversity = {
          ...university,
          starredAt: Date.now()
        }
        setStarredUniversities(prev => {
          const isAlreadyStarred = prev.some(starred => starred.id === university.id)
          if (!isAlreadyStarred) {
            return [...prev, newStarred]
          }
          return prev
        })
      } else if (action === 'unstar') {
        setStarredUniversities(prev => 
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

  // Mock recent activity data
  const mockRecentActivity = [
    { type: 'starred', university: 'MIT', time: '2 hours ago' },
    { type: 'viewed', university: 'Stanford University', time: '1 day ago' },
    { type: 'compared', universities: ['Harvard', 'Yale'], time: '2 days ago' },
  ]

  return (
    <div
      className={`${rightSidebarOpen ? "w-80" : "w-16"} bg-background flex flex-col transition-all duration-300 relative`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {rightSidebarOpen ? (
          <h2 className="text-sm font-medium text-foreground">Quick Actions</h2>
        ) : (
          <div className="w-full flex justify-center">
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={`${rightSidebarOpen ? "px-4" : "px-2"} py-4 border-b border-border`}>
        <div className="space-y-2">
          {rightSidebarOpen ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Filter className="w-4 h-4" />
                <span className="text-xs">Advanced Filter</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Activity className="w-4 h-4" />
                <span className="text-xs">Compare</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Deadlines</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Advanced Filter"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Compare"
              >
                <Activity className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Deadlines"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Starred Universities */}
      {user && starredUniversities.length > 0 && (
        <div className={`${rightSidebarOpen ? "px-4" : "px-2"} py-4 border-b border-border`}>
          {rightSidebarOpen ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground/70 pb-2 font-medium tracking-wide uppercase">
                Starred
              </div>
              {starredUniversities.slice(0, 4).map((university) => (
                <Link key={university.id} href={`/universities/${university.id}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                    <Image
                      src={getUniversityEmblemPath(university.name)}
                      alt={`${university.name} emblem`}
                      width={12}
                      height={12}
                      className="flex-shrink-0 rounded-sm"
                      onError={(e) => {
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
              {starredUniversities.length > 4 && (
                <Link href="/universities?tab=starred">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                    <span className="truncate">+{starredUniversities.length - 4} more</span>
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {starredUniversities.slice(0, 3).map((university) => (
                <Link key={university.id} href={`/universities/${university.id}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    title={university.name}
                  >
                    <Image
                      src={getUniversityEmblemPath(university.name)}
                      alt={`${university.name} emblem`}
                      width={16}
                      height={16}
                      className="rounded-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const starIcon = target.nextElementSibling as HTMLElement
                        if (starIcon) starIcon.style.display = 'block'
                      }}
                    />
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" style={{display: 'none'}} />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className={`${rightSidebarOpen ? "px-4" : "px-2"} py-4 border-b border-border flex-1`}>
        {rightSidebarOpen ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground/70 pb-2 font-medium tracking-wide uppercase">
              Recent Activity
            </div>
            {mockRecentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground">
                <Activity className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-foreground font-medium">
                    {activity.type === 'starred' && `Starred ${activity.university}`}
                    {activity.type === 'viewed' && `Viewed ${activity.university}`}
                    {activity.type === 'compared' && `Compared ${activity.universities.join(' vs ')}`}
                  </div>
                  <div className="text-muted-foreground">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title="Recent Activity"
            >
              <Activity className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`${rightSidebarOpen ? "px-4" : "px-2"} py-4`}>
        <div className="space-y-2">
          {rightSidebarOpen ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="w-4 h-4" />
                <span className="text-xs">Notifications</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-xs">Help</span>
              </Button>
              <div className="pt-2">
                <RightSidebarToggle 
                  isOpen={rightSidebarOpen} 
                  onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
                  showText={rightSidebarOpen}
                />
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              <div className="pt-2">
                <RightSidebarToggle 
                  isOpen={rightSidebarOpen} 
                  onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
                  showText={false}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}