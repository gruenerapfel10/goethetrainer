'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Bookmark, MapPin } from 'lucide-react'
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
  
  // Parallax hover effect hooks - must be declared before any conditional returns
  const imageRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });

  // Convert university name to file path format
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
    // Load real university data from JSON
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
        <p className="text-muted-foreground">Loading university details...</p>
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
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Floating Back Button */}
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
            className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-md border border-border hover:bg-muted/80 hover:border-border transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
            <span className="sr-only">Back to Universities</span>
          </Button>
        </Link>
      </motion.div>

      <div className="flex flex-col lg:flex-row h-screen">
        {/* Image Section - 70% */}
        <motion.div 
          ref={imageRef}
          className="lg:w-[70%] w-full h-[50vh] lg:h-full relative bg-muted overflow-hidden"
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
            
            {/* Vignette Effect */}
            <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
          </motion.div>
          
          {/* MUA Pattern Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 mua-pattern opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <motion.div 
                className="text-[40vw] font-bold text-white/[0.02] select-none leading-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                MUA
              </motion.div>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          
          {/* Animated Title */}
          <motion.div 
            className="absolute bottom-0 left-0 p-12"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.h1 
              className="text-5xl lg:text-6xl font-bold mb-3 text-white"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {university.name}
            </motion.h1>
            <motion.div 
              className="flex items-center gap-2 text-xl text-white/80"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <MapPin className="h-5 w-5" />
              {university.country}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Data Stream Section - 30% */}
        <motion.div 
          className="lg:w-[30%] w-full bg-background text-foreground relative flex flex-col border-l border-border"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto data-stream-scroll">
            <div className="p-8 pb-32">
              {/* Metrics Grid */}
              <motion.div 
                className="grid grid-cols-2 gap-6 pb-8 border-b border-border"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div>
                  <div className="text-3xl font-mono font-bold text-blue-500">#{university.rank}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">GLOBAL RANK</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-foreground">{university.country}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">COUNTRY</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-foreground">#{university.employer_reputation_rank}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">EMPLOYER REP</div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-bold text-foreground">#{university.academic_reputation_rank}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">ACADEMIC REP</div>
                </div>
              </motion.div>

              {/* University Ethos */}
              <motion.div 
                className="py-8 border-b border-border"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <h3 className="text-sm font-mono text-muted-foreground mb-4">// ETHOS</h3>
                <p className="text-foreground/80 leading-relaxed">
                  {university.name} stands as a beacon of academic excellence, ranked #{university.rank} globally. 
                  This institution has consistently demonstrated leadership in research, innovation, and educational 
                  outcomes, making it a premier destination for ambitious students worldwide.
                </p>
              </motion.div>

              {/* Program Tags */}
              {university.supported_degrees && university.supported_degrees.length > 0 && (
                <motion.div 
                  className="py-8 border-b border-border"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  <h3 className="text-sm font-mono text-muted-foreground mb-4">// PROGRAM HIGHLIGHTS</h3>
                  <div className="flex flex-wrap gap-2">
                    {university.supported_degrees.slice(0, 7).map((degree, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.8 + index * 0.05, duration: 0.3 }}
                      >
                        <Badge 
                          variant="outline" 
                          className="border-border text-foreground bg-transparent hover:bg-muted hover:border-blue-500/50 hover:text-blue-500 transition-all duration-300 cursor-pointer"
                        >
                          {degree}
                        </Badge>
                      </motion.div>
                    ))}
                    {university.supported_degrees.length > 7 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.15, duration: 0.3 }}
                      >
                        <Badge 
                          variant="outline" 
                          className="border-border text-muted-foreground bg-transparent"
                        >
                          +{university.supported_degrees.length - 7} more
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Application Info */}
              <motion.div 
                className="py-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <h3 className="text-sm font-mono text-muted-foreground mb-4">// APPLICATION</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">DEADLINE</div>
                    <div className="text-lg text-foreground/80">October 31, 2024</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">ADMISSION RATE</div>
                    <div className="text-lg text-foreground/80">Highly Selective</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sticky CTA Footer */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm border-t border-border"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <div className="space-y-3">
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 h-12 text-base font-medium transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                size="lg"
              >
                Apply Now
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border h-10 transition-all duration-300"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Save to List
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}