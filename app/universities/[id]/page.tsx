'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin, Star, Globe, Users, Award } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'

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
  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [nationality, setNationality] = useState('us')
  

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
    // Get nationality from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const nationalityParam = urlParams.get('nationality') || 'us'
    setNationality(nationalityParam)
    
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading university details...</p>
        </motion.div>
      </div>
    )
  }

  if (!university) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">University not found</h1>
          <Link href="/universities">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Universities
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
      <div className="relative z-20 px-4 py-3 bg-black/20 backdrop-blur-md border-b border-white/20">
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
                <div className="text-white">
                  <div className="font-semibold text-sm">{university.name}</div>
                  <div className="text-xs text-white/70">{university.country}</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/universities">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 border-white/30 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Button className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700/80 border border-blue-500/30">Apply Now</Button>
            <Button variant="outline" className="gap-2 text-white border-white/30 hover:bg-white/20">
              <Bookmark className="h-4 w-4" />
              Save
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
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Professional Apple-Style Bento Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <BentoGrid className="w-full max-w-none">
            
            {/* Global Rank - Large Hero */}
            <BentoGridItem
              className="md:col-span-1"
              header={
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="text-7xl font-bold text-blue-400 mb-3 leading-none">#{university.rank}</div>
                    <div className="text-sm font-medium text-white/80 uppercase tracking-widest">Global Rank</div>
                  </div>
                </div>
              }
            />

            {/* Academic Requirements - Large */}
            {getAcademicRequirements() && (
              <BentoGridItem
                className="md:col-span-2"
                title={
                  <div className="flex items-center gap-3 text-white font-semibold">
                    <Award className="h-5 w-5 text-blue-400" />
                    Academic Requirements ({nationality.toUpperCase()})
                  </div>
                }
                description={
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* US/International: GPA */}
                    {getAcademicRequirements()?.gpa_minimum && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.gpa_minimum}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">GPA Minimum</div>
                      </div>
                    )}
                    {/* India: Class 12 percentage */}
                    {getAcademicRequirements()?.class_12_percentage && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.class_12_percentage}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Class 12 %</div>
                      </div>
                    )}
                    {/* UK: A-levels */}
                    {getAcademicRequirements()?.a_levels && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.a_levels}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">A-levels</div>
                      </div>
                    )}
                    {/* Russia: Diploma */}
                    {getAcademicRequirements()?.diploma && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.diploma}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Diploma</div>
                      </div>
                    )}
                    {/* SAT Scores */}
                    {getAcademicRequirements()?.sat_scores?.average && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.sat_scores?.average}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">SAT Average</div>
                      </div>
                    )}
                    {/* ACT Scores */}
                    {getAcademicRequirements()?.act_scores?.average && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.act_scores?.average}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">ACT Average</div>
                      </div>
                    )}
                    {/* IB Score */}
                    {getAcademicRequirements()?.ib && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.ib}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">IB Score</div>
                      </div>
                    )}
                    {/* Russia: Unified State Exam */}
                    {getAcademicRequirements()?.unified_state_exam && (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{getAcademicRequirements()?.unified_state_exam}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">State Exam</div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* Financial Information */}
            <BentoGridItem
              className=""
              title={<span className="text-white font-semibold">Financial</span>}
              description={
                getCostData() ? (
                  <div className="space-y-3">
                    {getCostData()?.tuition_2025 && (
                      <div>
                        <div className="text-2xl font-bold text-green-400">{getCostData()?.tuition_2025}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Tuition 2025</div>
                      </div>
                    )}
                  </div>
                ) : getScholarshipData()?.need_based ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-green-400">{getScholarshipData()?.need_based?.average_award_amount || "Available"}</div>
                      <div className="text-xs text-white/70 uppercase tracking-wide">Aid Available</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/70">No financial data available</div>
                )
              }
            />

            {/* Rankings Secondary */}
            <BentoGridItem
              className=""
              title={<span className="text-white font-semibold">Other Rankings</span>}
              description={
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400">#{university.employer_reputation_rank}</div>
                    <div className="text-xs text-white/70 uppercase tracking-wide">Employer</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">#{university.academic_reputation_rank}</div>
                    <div className="text-xs text-white/70 uppercase tracking-wide">Academic</div>
                  </div>
                </div>
              }
            />

            {/* Admission Stats */}
            <BentoGridItem
              className=""
              title={<span className="text-white font-semibold">Admission</span>}
              description={
                <div className="space-y-4 mt-3">
                  {university.acceptance_rate && (
                    <div>
                      <div className="text-2xl font-bold text-red-400">{university.acceptance_rate}</div>
                      <div className="text-xs text-white/70 uppercase tracking-wide">Acceptance Rate</div>
                    </div>
                  )}
                  {university.international_students_percentage && (
                    <div>
                      <div className="text-xl font-bold text-white/90">{university.international_students_percentage}</div>
                      <div className="text-xs text-white/70 uppercase tracking-wide">International %</div>
                    </div>
                  )}
                </div>
              }
            />

            {/* Language Requirements */}
            {getLanguageRequirements() && getLanguageRequirements()?.minimum_scores && (
              <BentoGridItem
                className=""
                title={
                  <div className="flex items-center gap-3 text-white font-semibold">
                    <Globe className="h-5 w-5 text-green-400" />
                    Language
                  </div>
                }
                description={
                  <div className="space-y-4 mt-3">
                    {getLanguageRequirements()?.minimum_scores?.ielts && (
                      <div>
                        <div className="text-2xl font-bold text-white">{getLanguageRequirements()?.minimum_scores?.ielts}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">IELTS Minimum</div>
                      </div>
                    )}
                    {getLanguageRequirements()?.minimum_scores?.toefl && (
                      <div>
                        <div className="text-2xl font-bold text-white">{getLanguageRequirements()?.minimum_scores?.toefl}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">TOEFL Minimum</div>
                      </div>
                    )}
                    {getLanguageRequirements()?.minimum_scores?.duolingo && (
                      <div>
                        <div className="text-2xl font-bold text-white">{getLanguageRequirements()?.minimum_scores?.duolingo}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Duolingo</div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* Deadlines - Wide Card */}
            {getDeadlinesData() && (
              <BentoGridItem
                className="md:col-span-2"
                title={
                  <div className="flex items-center gap-3 text-white font-semibold">
                    <span className="text-xl">⏰</span>
                    Important Deadlines
                  </div>
                }
                description={
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {getDeadlinesData()?.early_action && (
                      <div className="p-3 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-400/30">
                        <div className="text-sm font-medium text-white">Early Action</div>
                        <div className="text-lg font-bold text-red-300">{getDeadlinesData()?.early_action}</div>
                      </div>
                    )}
                    {getDeadlinesData()?.regular_decision && (
                      <div className="p-3 bg-orange-500/20 backdrop-blur-sm rounded-lg border border-orange-400/30">
                        <div className="text-sm font-medium text-white">Regular Decision</div>
                        <div className="text-lg font-bold text-orange-300">{getDeadlinesData()?.regular_decision}</div>
                      </div>
                    )}
                    {getDeadlinesData()?.international_deadline && (
                      <div className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-400/30">
                        <div className="text-sm font-medium text-white">International</div>
                        <div className="text-lg font-bold text-purple-300">{getDeadlinesData()?.international_deadline}</div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* Scholarships - Wide Card */}
            {getScholarshipData() && (
              <BentoGridItem
                className="md:col-span-3"
                title={<span className="text-white font-semibold text-lg">Scholarship Opportunities</span>}
                description={
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Need-based scholarships */}
                    {getScholarshipData()?.need_based?.available && (
                      <div className="p-4 bg-green-500/20 backdrop-blur-sm rounded-xl border border-green-400/30">
                        <h4 className="font-semibold text-green-200 mb-3">Need-based Aid</h4>
                        <div className="space-y-2 text-sm">
                          {getScholarshipData()?.need_based?.average_award && (
                            <div>
                              <span className="text-green-200">Average: </span>
                              <span className="font-medium text-green-100">{getScholarshipData()?.need_based?.average_award}</span>
                            </div>
                          )}
                          {getScholarshipData()?.need_based?.percentage_receiving && (
                            <div>
                              <span className="text-green-200">Receiving: </span>
                              <span className="font-medium text-green-100">{getScholarshipData()?.need_based?.percentage_receiving}</span>
                            </div>
                          )}
                          {getScholarshipData()?.need_based?.income_threshold && (
                            <div className="text-green-200 text-xs">{getScholarshipData()?.need_based?.income_threshold}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Merit-based scholarships */}
                    {getScholarshipData()?.merit_based?.available && (
                      <div className="p-4 bg-blue-500/20 backdrop-blur-sm rounded-xl border border-blue-400/30">
                        <h4 className="font-semibold text-blue-200 mb-3">Merit-based</h4>
                        {getScholarshipData()?.merit_based?.scholarships ? (
                          <div className="space-y-2">
                            {getScholarshipData()?.merit_based?.scholarships.map((scholarship: any, index: number) => (
                              <div key={index} className="text-sm">
                                <div className="font-medium text-blue-100">{scholarship.name}</div>
                                <div className="text-blue-200">{scholarship.amount}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-blue-200 text-sm">{getScholarshipData()?.merit_based?.description || "Available"}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Work study */}
                    {getScholarshipData()?.work_study?.available && (
                      <div className="p-4 bg-purple-500/20 backdrop-blur-sm rounded-xl border border-purple-400/30">
                        <h4 className="font-semibold text-purple-200 mb-3">Work Study</h4>
                        <div className="space-y-2 text-sm">
                          {getScholarshipData()?.work_study?.typical_hours && (
                            <div>
                              <span className="text-purple-200">Hours/week: </span>
                              <span className="font-medium text-purple-100">{getScholarshipData()?.work_study?.typical_hours}</span>
                            </div>
                          )}
                          {getScholarshipData()?.work_study?.hourly_wage && (
                            <div>
                              <span className="text-purple-200">Hourly wage: </span>
                              <span className="font-medium text-purple-100">{getScholarshipData()?.work_study?.hourly_wage}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Research opportunities */}
                    {getScholarshipData()?.research_opportunities?.undergraduate_research && (
                      <div className="p-4 bg-orange-500/20 backdrop-blur-sm rounded-xl border border-orange-400/30">
                        <h4 className="font-semibold text-orange-200 mb-3">Research Opportunities</h4>
                        <div className="space-y-2 text-sm">
                          {getScholarshipData()?.research_opportunities?.paid_positions && (
                            <div className="text-orange-100">{getScholarshipData()?.research_opportunities?.paid_positions}</div>
                          )}
                          {getScholarshipData()?.research_opportunities?.funding_available && (
                            <div className="font-medium text-orange-200">{getScholarshipData()?.research_opportunities?.funding_available}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* External scholarships */}
                    {getScholarshipData()?.external_scholarships && (
                      <div className="p-4 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30">
                        <h4 className="font-semibold text-amber-200 mb-3">External Scholarships</h4>
                        <div className="space-y-2 text-sm">
                          {getScholarshipData()?.external_scholarships?.private_foundations?.length > 0 && (
                            <div className="text-amber-100">{getScholarshipData()?.external_scholarships?.private_foundations?.length} foundations available</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                }
              />
            )}

            {/* Visa Requirements - for countries that need it */}
            {getVisaData() && (
              <BentoGridItem
                className="md:col-span-2"
                title={
                  <div className="flex items-center gap-3 text-white font-semibold">
                    <span className="text-xl">🛂</span>
                    Visa Requirements
                  </div>
                }
                description={
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {getVisaData()?.visa_type && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white">{getVisaData()?.visa_type}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Visa Type</div>
                      </div>
                    )}
                    {getVisaData()?.visa_application_fee && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white">{getVisaData()?.visa_application_fee}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Application Fee</div>
                      </div>
                    )}
                    {getVisaData()?.financial_proof_required && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white">{getVisaData()?.financial_proof_required}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Financial Proof</div>
                      </div>
                    )}
                    {getVisaData()?.success_rate && (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-green-400">{getVisaData()?.success_rate}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wide">Success Rate</div>
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