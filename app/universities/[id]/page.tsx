'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin, Star, Globe, Users, Award } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

export default function UniversityDetailPage() {
  const params = useParams()
  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  

  const getUniversityImagePath = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  };

  useEffect(() => {
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
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">{university.name}</h1>
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
          <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 h-10 px-6">
            Apply Now
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/20 h-10 px-4">
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}