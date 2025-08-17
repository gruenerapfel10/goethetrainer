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
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >

      <div className="relative min-h-screen">
        <motion.div 
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="absolute inset-0">
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
            
            {/* Vignette Effect */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/10 to-black/40 pointer-events-none" />
            
            {/* Back Button */}
            <motion.div 
              className="absolute top-8 left-8 z-50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <Link href="/universities">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-12 w-12 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300 shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to Universities</span>
                </Button>
              </Link>
            </motion.div>
          </div>
          
          <motion.div 
            className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 pb-12 lg:pb-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.h1 
              className="text-4xl lg:text-6xl font-bold mb-3 text-white drop-shadow-lg max-w-4xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {university.name}
            </motion.h1>
            <motion.div 
              className="flex items-center gap-2 text-lg lg:text-xl text-white/90"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <MapPin className="h-5 w-5" />
              {university.country}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="absolute top-8 right-8 w-96 h-[calc(100vh-4rem)] z-40 pointer-events-auto hidden lg:block"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="h-full bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent rounded-[2rem]" />
            
            <div className="relative h-full flex flex-col rounded-[2rem]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 rounded-t-[2rem]">
                <motion.div 
                  className="grid grid-cols-2 gap-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">#{university.rank}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-1">Global Rank</div>
                  </div>
                  <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{university.country}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-1">Country</div>
                  </div>
                  <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">#{university.employer_reputation_rank}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-1">Employer Rep</div>
                  </div>
                  <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">#{university.academic_reputation_rank}</div>
                    <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-1">Academic Rep</div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Excellence</h3>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    Ranked #{university.rank} globally with outstanding academic reputation.
                  </p>
                </motion.div>

                {university.supported_degrees && university.supported_degrees.length > 0 && (
                  <motion.div 
                    className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 dark:border-white/10"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-emerald-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Programs</h3>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {university.supported_degrees.slice(0, 4).map((degree, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.8 + index * 0.05, duration: 0.3 }}
                        >
                          <Badge 
                            variant="secondary" 
                            className="bg-white/30 dark:bg-black/30 text-slate-700 dark:text-slate-300 border-0 text-xs px-2 py-1"
                          >
                            {degree}
                          </Badge>
                        </motion.div>
                      ))}
                      {university.supported_degrees.length > 4 && (
                        <Badge 
                          variant="secondary" 
                          className="bg-white/30 dark:bg-black/30 text-slate-600 dark:text-slate-400 border-0 text-xs px-2 py-1"
                        >
                          +{university.supported_degrees.length - 4}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div 
                className="p-4 border-t border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-b-[2rem]"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 h-10 text-sm font-medium transition-all duration-300 shadow-lg backdrop-blur-sm"
                  >
                    Apply Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/10 dark:bg-black/10 border-white/30 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-black/20 h-8 text-sm transition-all duration-300 backdrop-blur-sm"
                  >
                    <Bookmark className="h-3 w-3 mr-2" />
                    Save
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}