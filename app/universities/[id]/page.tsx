'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin, Star, Globe, Users, Award, DollarSign, Clock, GraduationCap, FileText, BadgeDollarSign, Trophy } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { SwipeableWidget } from '@/components/ui/swipeable-widget'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/context/firebase-auth-context'
import { profileService } from '@/lib/firebase/profile-service'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface University {
  id: string;
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  acceptance_rate?: string;
  international_students_percentage?: string;
  total_enrollment?: number;
  supported_degrees?: string[];
  cost_information?: {
    tuition_2025?: string;
    total_cost_of_attendance?: string;
    living_expenses?: string;
    inr_conversion?: string;
  };
  career_outcomes?: {
    employment_rate_6_months?: string;
    average_starting_salary?: string;
    median_salary_10_years?: string;
    top_employers?: string[];
  };
  location?: {
    city?: string;
    climate?: string;
    nearest_airport?: string;
  };
  us?: any;
  in?: any;
  gb?: any;
  ru?: any;
}

export default function UniversityDetailPage() {
  const params = useParams()
  const t = useTranslations()
  const { user } = useAuth()
  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [nationality, setNationality] = useState('us')
  const [isStarred, setIsStarred] = useState(false)
  const [isStarring, setIsStarring] = useState(false)
  

  const getUniversityImagePath = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  };

  const getUniversityEmblemPath = (name: string) => {
    const path = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
    return `/university-images/${path}/emblem_${path}.svg`;
  };

  // Helper function to get data from nationality-specific section or root level
  const getCostData = () => {
    if (!university) return null;
    // Try nationality-specific first
    const nationalityData = university[nationality as keyof University];
    if (nationalityData && typeof nationalityData === 'object' && 'cost_information' in nationalityData) {
      return nationalityData.cost_information;
    }
    // Fallback to root level
    return university.cost_information || null;
  };

  const getScholarshipData = () => {
    if (!university) return null;
    const nationalityData = university[nationality as keyof University];
    if (nationalityData && typeof nationalityData === 'object' && 'scholarship_opportunities' in nationalityData) {
      return nationalityData.scholarship_opportunities;
    }
    return null;
  };

  const getCareerData = () => {
    if (!university) return null;
    // Try nationality-specific first
    const nationalityData = university[nationality as keyof University];
    if (nationalityData && typeof nationalityData === 'object' && 'career_outcomes' in nationalityData) {
      return nationalityData.career_outcomes;
    }
    // Fallback to root level
    return university.career_outcomes || null;
  };

  const getLocationData = () => {
    if (!university) return null;
    // Try nationality-specific first
    const nationalityData = university[nationality as keyof University];
    if (nationalityData && typeof nationalityData === 'object' && 'location' in nationalityData) {
      return nationalityData.location;
    }
    // Fallback to root level
    return university.location || null;
  };

  const getRequirementsData = () => {
    if (!university) return null;
    const nationalityData = university[nationality as keyof University];
    if (nationalityData && typeof nationalityData === 'object' && 'requirements' in nationalityData) {
      return nationalityData.requirements;
    }
    return null;
  };

  const getApplicationData = () => {
    const requirements = getRequirementsData();
    return requirements?.application_requirements || null;
  };

  const getDeadlinesData = () => {
    const requirements = getRequirementsData();
    return requirements?.deadlines || null;
  };

  const getVisaData = () => {
    const requirements = getRequirementsData();
    return requirements?.visa_requirements || null;
  };

  const getAcademicRequirements = () => {
    const requirements = getRequirementsData();
    return requirements?.academic_requirements || null;
  };

  const getLanguageRequirements = () => {
    const requirements = getRequirementsData();
    return requirements?.language_requirements || null;
  };

  useEffect(() => {
    // Load individual university JSON file by ID
    fetch(`/${params.id}.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`University file not found: ${params.id}.json`)
        }
        return res.json()
      })
      .then(data => {
        setUniversity(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load university data:', err)
        setLoading(false)
      })
  }, [params.id])

  // Load user's nationality preference from profile or URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const nationalityParam = urlParams.get('nationality')
    
    if (nationalityParam) {
      // URL parameter takes priority
      setNationality(nationalityParam)
    } else if (user?.uid) {
      // Load from user profile if no URL parameter
      profileService.getProfile(user.uid)
        .then(profile => {
          if (profile?.nationality) {
            setNationality(profile.nationality)
          } else {
            setNationality('us') // fallback if no saved nationality
          }
        })
        .catch(err => {
          console.error('Failed to load user nationality preference:', err)
          setNationality('us') // fallback on error
        })
    } else {
      // No user logged in, default to 'us'
      setNationality('us')
    }
  }, [user?.uid])

  // Listen for nationality changes from the sidebar
  useEffect(() => {
    const handleNationalityChange = (event: CustomEvent) => {
      setNationality(event.detail)
    }

    window.addEventListener('nationalityChanged', handleNationalityChange as EventListener)
    
    return () => {
      window.removeEventListener('nationalityChanged', handleNationalityChange as EventListener)
    }
  }, [])

  // Check if university is starred when user or university changes
  useEffect(() => {
    if (user?.uid && university) {
      profileService.isUniversityStarred(user.uid, university.id)
        .then(starred => setIsStarred(starred))
        .catch(err => console.error('Failed to check if university is starred:', err))
    }
  }, [user?.uid, university?.id])

  // Handle star/unstar functionality
  const handleToggleStar = async () => {
    if (!user?.uid || !university || isStarring) return
    
    setIsStarring(true)
    try {
      if (isStarred) {
        await profileService.unstarUniversity(user.uid, university.id)
        setIsStarred(false)
        // Dispatch custom event for optimistic UI update
        window.dispatchEvent(new CustomEvent('starredUniversityUpdate', {
          detail: { action: 'unstar', university: { id: university.id } }
        }))
      } else {
        const universityData = {
          id: university.id,
          name: university.name,
          country: university.country,
          rank: university.rank
        }
        await profileService.starUniversity(user.uid, universityData)
        setIsStarred(true)
        // Dispatch custom event for optimistic UI update
        window.dispatchEvent(new CustomEvent('starredUniversityUpdate', {
          detail: { action: 'star', university: universityData }
        }))
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    } finally {
      setIsStarring(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('university.loading')}</p>
        </motion.div>
      </div>
    )
  }

  if (!university) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('university.notFound')}</h1>
          <Link href="/universities">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('university.backToUniversities')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const universityPath = university ? getUniversityImagePath(university.name) : '';
  const campusImagePath = `/university-images/${universityPath}/campus_${universityPath}.png`;
  const fallbackImagePath = `https://picsum.photos/seed/${university?.rank}/1200/800`;

  return (
    <div className="relative min-h-screen">
      {/* Controls at top */}
      <div className="relative z-20 px-4 py-3 bg-black/20 dark:bg-black/20 light:bg-white/30 backdrop-blur-md border-b border-white/20 dark:border-white/20 light:border-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {university && (
              <div className="flex items-center gap-3">
                <Image
                  src={getUniversityEmblemPath(university.name)}
                  alt={`${university.name} emblem`}
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="text-white dark:text-white light:text-black">
                  <div className="font-semibold text-sm">{university.name}</div>
                  <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70">{university.country}</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/universities">
              <Button variant="ghost" size="sm" className="text-white dark:text-white light:text-black hover:bg-white/20 border-white/30 dark:border-white/30 light:border-black/30 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700/80 border border-blue-500/30">{t('university.applyNow')}</Button>
            <Button 
              variant="outline" 
              className={`gap-2 text-white dark:text-white light:text-black border-white/30 dark:border-white/30 light:border-black/30 hover:bg-white/20 ${isStarred ? 'bg-yellow-500/20 border-yellow-400/40' : ''}`}
              onClick={handleToggleStar}
              disabled={isStarring || !user}
            >
              <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {isStarring ? t('university.saving') : isStarred ? t('university.saved') : t('university.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Full Screen Background */}
      {!imageError ? (
        <Image
          src={campusImagePath}
          alt={university.name}
          fill
          className="object-cover"
          priority
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={fallbackImagePath}
          alt={university.name}
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/40 light:bg-black/20"></div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Professional Apple-Style Bento Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <BentoGrid className="w-full max-w-none">
            
            {/* University Rankings - Swipeable Widget */}
            <BentoGridItem
              className=""
              header={
                <SwipeableWidget
                  title={
                    <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                      <Trophy className="h-5 w-5 text-blue-600" />
                      University Rankings
                    </div>
                  }
                  views={[
                    // Global Rank View
                    {
                      id: 'global',
                      hasData: !!university.rank,
                      content: (
                        <div className="text-center space-y-3">
                          <div className="text-6xl font-bold text-blue-600 mb-3 leading-none">#{university.rank}</div>
                          <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.globalRank')}</div>
                          <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">QS World University Rankings</div>
                        </div>
                      )
                    },
                    // Employer Reputation View
                    {
                      id: 'employer',
                      hasData: !!university.employer_reputation_rank,
                      content: (
                        <div className="text-center space-y-3">
                          <div className="text-6xl font-bold text-white dark:text-white light:text-black mb-3 leading-none">#{university.employer_reputation_rank}</div>
                          <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.employer')} Reputation</div>
                          <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Employer Survey Ranking</div>
                        </div>
                      )
                    },
                    // Academic Reputation View
                    {
                      id: 'academic',
                      hasData: !!university.academic_reputation_rank,
                      content: (
                        <div className="text-center space-y-3">
                          <div className="text-6xl font-bold text-white dark:text-white light:text-black mb-3 leading-none">#{university.academic_reputation_rank}</div>
                          <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.academic')} Reputation</div>
                          <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Academic Survey Ranking</div>
                        </div>
                      )
                    }
                  ]}
                />
              }
            />

            {/* Academic Requirements - Swipeable */}
            {getAcademicRequirements() && (
              <BentoGridItem
                className=""
                header={
                  <SwipeableWidget
                    title={
                      <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                        <Award className="h-5 w-5 text-blue-600" />
                        {t('university.academicRequirements')}
                      </div>
                    }
                    views={[
                      // Grade Requirements View
                      {
                        id: 'grades',
                        hasData: !!(getAcademicRequirements()?.gpa_minimum || getAcademicRequirements()?.class_12_percentage || getAcademicRequirements()?.a_levels || (getAcademicRequirements()?.diploma && (typeof getAcademicRequirements()?.diploma !== 'object' || getAcademicRequirements()?.diploma?.total_average))),
                        content: (
                          <div className="text-center space-y-3">
                            {getAcademicRequirements()?.gpa_minimum ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.gpa_minimum}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.gpaMinimum')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">US Students</div>
                              </>
                            ) : getAcademicRequirements()?.class_12_percentage ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.class_12_percentage}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.class12Percentage')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Indian Students</div>
                              </>
                            ) : getAcademicRequirements()?.a_levels ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.a_levels}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.aLevels')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">UK Students</div>
                              </>
                            ) : getAcademicRequirements()?.diploma ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{typeof getAcademicRequirements()?.diploma === 'object' ? JSON.stringify(getAcademicRequirements()?.diploma) : getAcademicRequirements()?.diploma}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.diploma')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Russian Students</div>
                              </>
                            ) : (
                              <div className="text-white/70 dark:text-white/70 light:text-black/70">No grade requirements</div>
                            )}
                          </div>
                        )
                      },
                      // Standardized Tests View
                      {
                        id: 'tests',
                        hasData: !!(getAcademicRequirements()?.sat_scores?.average || getAcademicRequirements()?.act_scores?.average || getAcademicRequirements()?.ib || (getAcademicRequirements()?.unified_state_exam && (typeof getAcademicRequirements()?.unified_state_exam !== 'object' || getAcademicRequirements()?.unified_state_exam?.total_average))),
                        content: (
                          <div className="text-center space-y-3">
                            {getAcademicRequirements()?.sat_scores?.average ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.sat_scores?.average}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.satAverage')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">SAT Score</div>
                              </>
                            ) : getAcademicRequirements()?.act_scores?.average ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.act_scores?.average}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.actAverage')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">ACT Score</div>
                              </>
                            ) : getAcademicRequirements()?.ib ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getAcademicRequirements()?.ib}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.ibScore')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">IB Diploma</div>
                              </>
                            ) : getAcademicRequirements()?.unified_state_exam ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">
                                  {typeof getAcademicRequirements()?.unified_state_exam === 'object' ? 
                                    getAcademicRequirements()?.unified_state_exam?.total_average || 'Score Required' : 
                                    getAcademicRequirements()?.unified_state_exam}
                                </div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.stateExam')}</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Russian Exam</div>
                              </>
                            ) : (
                              <div className="text-white/70 dark:text-white/70 light:text-black/70">No test requirements</div>
                            )}
                          </div>
                        )
                      },
                      // Summary View - Only show if we have multiple requirements
                      {
                        id: 'summary',
                        hasData: [
                          getAcademicRequirements()?.gpa_minimum,
                          getAcademicRequirements()?.sat_scores?.average,
                          getAcademicRequirements()?.act_scores?.average,
                          getAcademicRequirements()?.ib,
                          getAcademicRequirements()?.class_12_percentage,
                          getAcademicRequirements()?.a_levels,
                          getAcademicRequirements()?.unified_state_exam ? 
                            (typeof getAcademicRequirements()?.unified_state_exam === 'object' ? 
                              getAcademicRequirements()?.unified_state_exam?.total_average : 
                              getAcademicRequirements()?.unified_state_exam) : null
                        ].filter(Boolean).length >= 2,
                        content: (
                          <div className="text-center space-y-2">
                            <div className="text-lg font-bold text-white dark:text-white light:text-black mb-3">Requirements for {nationality.toUpperCase()}</div>
                            <div className="space-y-1 text-sm">
                              {getAcademicRequirements()?.gpa_minimum && (
                                <div className="text-white/80">GPA: {getAcademicRequirements()?.gpa_minimum}</div>
                              )}
                              {getAcademicRequirements()?.sat_scores?.average && (
                                <div className="text-white/80">SAT: {getAcademicRequirements()?.sat_scores?.average}</div>
                              )}
                              {getAcademicRequirements()?.act_scores?.average && (
                                <div className="text-white/80">ACT: {getAcademicRequirements()?.act_scores?.average}</div>
                              )}
                              {getAcademicRequirements()?.ib && (
                                <div className="text-white/80">IB: {getAcademicRequirements()?.ib}</div>
                              )}
                              {getAcademicRequirements()?.class_12_percentage && (
                                <div className="text-white/80">Class 12: {getAcademicRequirements()?.class_12_percentage}</div>
                              )}
                              {getAcademicRequirements()?.a_levels && (
                                <div className="text-white/80">A-Levels: {getAcademicRequirements()?.a_levels}</div>
                              )}
                            </div>
                          </div>
                        )
                      }
                    ]}
                  />
                }
              />
            )}

            {/* Tuition & Costs */}
            <BentoGridItem
              className=""
              header={
                <SwipeableWidget
                  title={
                    <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Tuition & Costs
                    </div>
                  }
                  views={[
                    {
                      id: 'annual',
                      hasData: !!(university.tuition_2025_26?.international || university.tuition_2025_26?.estimated),
                      content: (
                        <div className="text-center space-y-3">
                          {university.tuition_2025_26?.international ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">{university.tuition_2025_26.international}</div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Annual Tuition</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">International Students</div>
                            </>
                          ) : university.tuition_2025_26?.estimated ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">{university.tuition_2025_26.estimated}</div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Annual Tuition</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Estimated</div>
                            </>
                          ) : (
                            <div className="text-white/70 dark:text-white/70 light:text-black/70">No tuition data</div>
                          )}
                        </div>
                      )
                    },
                    {
                      id: 'semester',
                      hasData: !!(university.tuition_2025_26?.international || university.tuition_2025_26?.estimated),
                      content: (
                        <div className="text-center space-y-3">
                          {university.tuition_2025_26?.international ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">
                                ${(parseInt(university.tuition_2025_26.international.replace(/[$,]/g, '')) / 2).toLocaleString()}
                              </div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Per Semester</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">International Students</div>
                            </>
                          ) : university.tuition_2025_26?.estimated ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">
                                ${(parseInt(university.tuition_2025_26.estimated.replace(/[$,]/g, '')) / 2).toLocaleString()}
                              </div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Per Semester</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Estimated</div>
                            </>
                          ) : (
                            <div className="text-white/70 dark:text-white/70 light:text-black/70">No tuition data</div>
                          )}
                        </div>
                      )
                    },
                    {
                      id: 'total',
                      hasData: !!(university.tuition_2025_26?.total_cost || getScholarshipData()?.need_based?.average_award),
                      content: (
                        <div className="text-center space-y-3">
                          {university.tuition_2025_26?.total_cost ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">{university.tuition_2025_26.total_cost}</div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Total Cost</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Including Living Expenses</div>
                            </>
                          ) : getScholarshipData()?.need_based?.average_award ? (
                            <>
                              <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getScholarshipData().need_based.average_award}</div>
                              <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Average Aid</div>
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Need-based</div>
                            </>
                          ) : (
                            <div className="text-white/70 dark:text-white/70 light:text-black/70">No total cost data</div>
                          )}
                        </div>
                      )
                    }
                  ]}
                />
              }
            />

            {/* Application Requirements */}
            {getApplicationData() && (
              <BentoGridItem
                className=""
                title={<span className="text-white dark:text-white light:text-black font-semibold">{t('university.application')}</span>}
                description={
                  <div className="space-y-4 mt-3">
                    {university.acceptance_rate && (
                      <div>
                        <div className="text-2xl font-bold text-white dark:text-white light:text-black">{university.acceptance_rate}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.acceptanceRate')}</div>
                      </div>
                    )}
                    {getApplicationData()?.letters_of_recommendation && (
                      <div>
                        <div className="text-2xl font-bold text-white dark:text-white light:text-black">{getApplicationData()?.letters_of_recommendation}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.recLetters')}</div>
                      </div>
                    )}
                    {getApplicationData()?.interview && (
                      <div>
                        <div className="text-lg font-bold text-white dark:text-white light:text-black/90">{getApplicationData()?.interview}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.interview')}</div>
                      </div>
                    )}
                    {getApplicationData()?.essays && Array.isArray(getApplicationData()?.essays) && (
                      <div>
                        <div className="text-2xl font-bold text-white dark:text-white light:text-black">{getApplicationData()?.essays.length}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.essaysRequired')}</div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* Language Requirements - Swipeable Widget */}
            {getLanguageRequirements() && (
              <BentoGridItem
                className=""
                header={
                  <SwipeableWidget
                    title={
                      <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                        <Globe className="h-5 w-5 text-blue-600" />
                        {t('university.language')}
                      </div>
                    }
                    views={[
                      // IELTS View
                      {
                        id: 'ielts',
                        hasData: !!getLanguageRequirements()?.minimum_scores?.ielts,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-5xl font-bold text-white dark:text-white light:text-black">{getLanguageRequirements()?.minimum_scores?.ielts}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.ieltsMinimum')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">International English Language Testing System</div>
                          </div>
                        )
                      },
                      // TOEFL View
                      {
                        id: 'toefl',
                        hasData: !!getLanguageRequirements()?.minimum_scores?.toefl,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-5xl font-bold text-white dark:text-white light:text-black">{getLanguageRequirements()?.minimum_scores?.toefl}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.toeflMinimum')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Test of English as a Foreign Language</div>
                          </div>
                        )
                      },
                      // Duolingo View
                      {
                        id: 'duolingo',
                        hasData: !!getLanguageRequirements()?.minimum_scores?.duolingo,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-5xl font-bold text-white dark:text-white light:text-black">{getLanguageRequirements()?.minimum_scores?.duolingo}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.duolingo')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Duolingo English Test</div>
                          </div>
                        )
                      },
                      // Not Required View (for native speakers)
                      {
                        id: 'not-required',
                        hasData: getLanguageRequirements()?.english_proficiency === 'native_or_equivalent',
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-3xl font-bold text-white dark:text-white light:text-black">{t('university.notRequired')}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.forUSStudents')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Native English Speakers</div>
                          </div>
                        )
                      },
                      // Check Website View (fallback)
                      {
                        id: 'check-website',
                        hasData: (!getLanguageRequirements()?.minimum_scores || Object.keys(getLanguageRequirements()?.minimum_scores).length === 0) && getLanguageRequirements()?.english_proficiency !== 'native_or_equivalent',
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-2xl font-bold text-white dark:text-white light:text-black">{t('university.checkWebsite')}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.forRequirements')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Visit University Website</div>
                          </div>
                        )
                      }
                    ]}
                  />
                }
              />
            )}

            {/* Deadlines - Square Card */}
            {getDeadlinesData() && (
              <BentoGridItem
                className=""
                header={
                  <SwipeableWidget
                    title={
                      <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                        <Clock className="h-5 w-5 text-blue-600" />
                        {t('university.importantDeadlines')}
                      </div>
                    }
                    views={[
                      {
                        id: 'early',
                        hasData: !!getDeadlinesData()?.early_action,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getDeadlinesData()?.early_action}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.earlyAction')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Application Deadline</div>
                          </div>
                        )
                      },
                      {
                        id: 'regular',
                        hasData: !!getDeadlinesData()?.regular_decision,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getDeadlinesData()?.regular_decision}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.regularDecision')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Application Deadline</div>
                          </div>
                        )
                      },
                      {
                        id: 'international',
                        hasData: !!getDeadlinesData()?.international_deadline,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getDeadlinesData()?.international_deadline}</div>
                            <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.international')}</div>
                            <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Application Deadline</div>
                          </div>
                        )
                      }
                    ]}
                  />
                }
              />
            )}

            {/* Scholarships - Square Swipeable Widget */}
            {getScholarshipData() && (
              <BentoGridItem
                className=""
                header={
                  <SwipeableWidget
                    title={
                      <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                        <BadgeDollarSign className="h-5 w-5 text-blue-600" />
                        {t('university.scholarshipOpportunities')}
                      </div>
                    }
                    views={[
                      // Need-based Aid View
                      {
                        id: 'need-based',
                        hasData: !!getScholarshipData()?.need_based?.available,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-lg font-bold text-white dark:text-white light:text-black mb-3">{t('university.needBasedAid')}</div>
                            {getScholarshipData()?.need_based?.average_award && (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getScholarshipData()?.need_based?.average_award}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.average')} Award</div>
                              </>
                            )}
                            {getScholarshipData()?.need_based?.percentage_receiving && (
                              <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">{getScholarshipData()?.need_based?.percentage_receiving} of students receive aid</div>
                            )}
                          </div>
                        )
                      },
                      // Merit-based Aid View
                      {
                        id: 'merit-based',
                        hasData: !!getScholarshipData()?.merit_based?.available,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-lg font-bold text-white dark:text-white light:text-black mb-3">{t('university.meritBased')}</div>
                            {getScholarshipData()?.merit_based?.scholarships?.length > 0 ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getScholarshipData()?.merit_based?.scholarships?.length}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Merit Scholarships</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Available Programs</div>
                              </>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-white dark:text-white light:text-black">Available</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Merit-Based Aid</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Check university website</div>
                              </>
                            )}
                          </div>
                        )
                      },
                      // Work Study View
                      {
                        id: 'work-study',
                        hasData: !!getScholarshipData()?.work_study?.available,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-lg font-bold text-white dark:text-white light:text-black mb-3">{t('university.workStudy')}</div>
                            {getScholarshipData()?.work_study?.hourly_wage ? (
                              <>
                                <div className="text-4xl font-bold text-white dark:text-white light:text-black">{getScholarshipData()?.work_study?.hourly_wage}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Hourly Wage</div>
                                {getScholarshipData()?.work_study?.typical_hours && (
                                  <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">{getScholarshipData()?.work_study?.typical_hours} per week</div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-white dark:text-white light:text-black">Available</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Work-Study Program</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">On-campus employment</div>
                              </>
                            )}
                          </div>
                        )
                      },
                      // Research Opportunities View
                      {
                        id: 'research',
                        hasData: !!getScholarshipData()?.research_opportunities?.undergraduate_research,
                        content: (
                          <div className="text-center space-y-3">
                            <div className="text-lg font-bold text-white dark:text-white light:text-black mb-3">{t('university.researchOpportunities')}</div>
                            {getScholarshipData()?.research_opportunities?.funding_available ? (
                              <>
                                <div className="text-2xl font-bold text-white dark:text-white light:text-black">{getScholarshipData()?.research_opportunities?.funding_available}</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Research Funding</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Undergraduate research</div>
                              </>
                            ) : (
                              <>
                                <div className="text-2xl font-bold text-white dark:text-white light:text-black">Available</div>
                                <div className="text-sm text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">Research Programs</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-black/50">Paid positions available</div>
                              </>
                            )}
                          </div>
                        )
                      }
                    ]}
                  />
                }
              />
            )}

            {/* Visa Requirements - for countries that need it */}
            {getVisaData() && (
              <BentoGridItem
                className="md:col-span-2"
                title={
                  <div className="flex items-center gap-3 text-white dark:text-white light:text-black font-semibold">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {t('university.visaRequirements')}
                  </div>
                }
                description={
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {getVisaData()?.visa_type && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white dark:text-white light:text-black">{getVisaData()?.visa_type}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.visaType')}</div>
                      </div>
                    )}
                    {getVisaData()?.visa_application_fee && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white dark:text-white light:text-black">{getVisaData()?.visa_application_fee}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.applicationFee')}</div>
                      </div>
                    )}
                    {getVisaData()?.financial_proof_required && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white dark:text-white light:text-black">{getVisaData()?.financial_proof_required}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.financialProof')}</div>
                      </div>
                    )}
                    {getVisaData()?.success_rate && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white dark:text-white light:text-black">{getVisaData()?.success_rate}</div>
                        <div className="text-xs text-white/70 dark:text-white/70 light:text-black/70 uppercase tracking-wide">{t('university.successRate')}</div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

          </BentoGrid>
        </div>
      </div>
    </div>
  )
}