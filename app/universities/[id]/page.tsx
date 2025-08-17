'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin, Star, Globe, Users, Award } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import NationalitySwitcher from '@/components/nationality-switcher'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface University {
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

  useEffect(() => {
    // Get nationality from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const nationalityParam = urlParams.get('nationality') || 'us'
    setNationality(nationalityParam)
    
    fetch('/500.json')
      .then(res => res.json())
      .then(data => {
        const foundUniversity = data.find((u: University) => u.rank === Number(params.id))
        setUniversity(foundUniversity)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load university data:', err)
        setLoading(false)
      })
  }, [params.id])

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
    <div className="relative w-full min-h-screen">

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
      
      {/* Seamless Info Overlay - Top Left */}
      <div className="absolute top-8 left-8 space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2 max-w-md leading-tight">{university.name}</h1>
          <div className="flex items-center gap-2 text-lg text-white/90">
            <MapPin className="h-5 w-5" />
            {university.country}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="text-white">
            <div className="text-2xl font-bold text-blue-400">#{university.rank}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">Global Rank</div>
          </div>
          <div className="text-white">
            <div className="text-lg font-bold text-emerald-400">#{university.employer_reputation_rank}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">Employer</div>
          </div>
          <div className="text-white">
            <div className="text-lg font-bold text-amber-400">#{university.academic_reputation_rank}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">Academic</div>
          </div>
        </div>

        {university.supported_degrees && university.supported_degrees.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {university.supported_degrees.slice(0, 3).map((degree, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30"
              >
                {degree}
              </span>
            ))}
            {university.supported_degrees.length > 3 && (
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white/70 text-sm border border-white/20">
                +{university.supported_degrees.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <NationalitySwitcher 
            value={nationality} 
            onChange={setNationality}
          />
          <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 h-10 px-6">
            Apply Now
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/20 h-10 px-4">
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Right Panel - Detailed Info */}
      <div className="absolute top-8 right-8 w-96 max-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-600/10 via-blue-500/15 to-blue-400/10 backdrop-blur-2xl rounded-2xl border border-blue-500/20 shadow-2xl overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-blue-400/20">
            <h3 className="text-lg font-semibold text-white">University Details</h3>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Cost Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Financial Information</h4>
              <div className="space-y-2 text-sm">
                {getCostData() ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/70">Tuition 2025:</span>
                      <span className="text-white font-medium">{getCostData()?.tuition_2025 || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Cost:</span>
                      <span className="text-white font-medium">{getCostData()?.total_cost_of_attendance || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Living Expenses:</span>
                      <span className="text-white font-medium">{getCostData()?.living_expenses || "N/A"}</span>
                    </div>
                    {getCostData()?.inr_conversion && (
                      <div className="flex justify-between">
                        <span className="text-white/70">INR Conversion:</span>
                        <span className="text-white font-medium">{getCostData()?.inr_conversion}</span>
                      </div>
                    )}
                  </>
                ) : getScholarshipData()?.need_based ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/70">Need-based Aid:</span>
                      <span className="text-white font-medium">{getScholarshipData()?.need_based?.average_award || "Available"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Receiving Aid:</span>
                      <span className="text-white font-medium">{getScholarshipData()?.need_based?.percentage_receiving || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Income Threshold:</span>
                      <span className="text-white font-medium text-xs">{getScholarshipData()?.need_based?.income_threshold || "N/A"}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-white/70 text-xs">No financial data available for {nationality.toUpperCase()}</div>
                )}
              </div>
            </div>

            {/* Career Outcomes */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Career Outcomes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Employment Rate:</span>
                  <span className="text-white font-medium">{getCareerData()?.employment_rate_6_months || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Starting Salary:</span>
                  <span className="text-white font-medium">{getCareerData()?.average_starting_salary || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">10-Year Median:</span>
                  <span className="text-white font-medium">{getCareerData()?.median_salary_10_years || "N/A"}</span>
                </div>
                {getCareerData()?.top_employers && (
                  <div>
                    <span className="text-white/70 block mb-1">Top Employers:</span>
                    <div className="flex flex-wrap gap-1">
                      {getCareerData()?.top_employers.slice(0, 4).map((employer, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white/90">
                          {employer}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Location</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">City:</span>
                  <span className="text-white font-medium">{getLocationData()?.city || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Climate:</span>
                  <span className="text-white font-medium text-xs">{getLocationData()?.climate || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Nearest Airport:</span>
                  <span className="text-white font-medium text-xs">{getLocationData()?.nearest_airport || "N/A"}</span>
                </div>
              </div>
            </div>


            {/* Admission Stats */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Admission</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Acceptance Rate:</span>
                  <span className="text-white font-medium">{university.acceptance_rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Total Enrollment:</span>
                  <span className="text-white font-medium">{university.total_enrollment?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">International %:</span>
                  <span className="text-white font-medium">{university.international_students_percentage}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}