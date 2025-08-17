'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin, Star, Globe, Users, Award } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'

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
  
  const imageRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });

  const getUniversityImagePath = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    mouseX.set(x);
    mouseY.set(y);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
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
      <motion.div 
        className="fixed top-6 left-6 z-50"
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

      <div className="flex flex-col lg:flex-row h-screen">
        <motion.div 
          ref={imageRef}
          className="lg:w-[65%] w-full h-[50vh] lg:h-full relative overflow-hidden"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
          >
            {!imageError ? (
              <Image
                src={campusImagePath}
                alt={university.name}
                fill
                className="object-cover scale-110"
                priority
                onError={() => setImageError(true)}
              />
            ) : (
              <Image
                src={fallbackImagePath}
                alt={university.name}
                fill
                className="object-cover scale-110"
                priority
              />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </motion.div>
          
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <motion.div 
                className="text-[35vw] font-bold text-white/[0.03] select-none leading-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                MUA
              </motion.div>
            </div>
          </div>
          
          <motion.div 
            className="absolute bottom-0 left-0 p-8 lg:p-12"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.h1 
              className="text-4xl lg:text-6xl font-bold mb-3 text-white drop-shadow-lg"
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
          className="lg:w-[35%] w-full relative lg:p-6"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="lg:absolute lg:inset-6 lg:top-8 lg:bottom-8 lg:right-8 bg-white/10 dark:bg-black/10 backdrop-blur-xl lg:rounded-[2rem] border border-white/20 dark:border-white/10 lg:shadow-2xl lg:shadow-black/10 dark:lg:shadow-black/30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent lg:rounded-[2rem]" />
            
            <div className="relative h-full flex flex-col lg:rounded-[2rem]">
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 lg:rounded-t-[2rem]">
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
                  className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-white/10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Excellence</h3>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                    {university.name} stands as a beacon of academic excellence, ranked #{university.rank} globally. 
                    This institution has consistently demonstrated leadership in research, innovation, and educational outcomes.
                  </p>
                </motion.div>

                {university.supported_degrees && university.supported_degrees.length > 0 && (
                  <motion.div 
                    className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-white/10"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-5 w-5 text-emerald-500" />
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Programs</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {university.supported_degrees.slice(0, 6).map((degree, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.8 + index * 0.05, duration: 0.3 }}
                        >
                          <Badge 
                            variant="secondary" 
                            className="bg-white/30 dark:bg-black/30 text-slate-700 dark:text-slate-300 border-0 hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-300"
                          >
                            {degree}
                          </Badge>
                        </motion.div>
                      ))}
                      {university.supported_degrees.length > 6 && (
                        <Badge 
                          variant="secondary" 
                          className="bg-white/30 dark:bg-black/30 text-slate-600 dark:text-slate-400 border-0"
                        >
                          +{university.supported_degrees.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-white/10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Application</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Deadline</div>
                      <div className="text-lg text-slate-800 dark:text-slate-200">October 31, 2024</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Admission Rate</div>
                      <div className="text-lg text-slate-800 dark:text-slate-200">Highly Selective</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                className="p-6 border-t border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-sm lg:rounded-b-[2rem]"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 h-12 text-base font-medium transition-all duration-300 shadow-lg backdrop-blur-sm"
                    size="lg"
                  >
                    Apply Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/10 dark:bg-black/10 border-white/30 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-black/20 h-10 transition-all duration-300 backdrop-blur-sm"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save to List
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