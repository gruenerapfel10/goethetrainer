'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface UniversityDetails {
  id: string;
  name: string;
  established: string;
  students: string;
  location: string;
  type: string;
  ranking: string;
  description: string;
  programs: string;
  website: string;
  country: string;
  employer_reputation_rank?: number;
  academic_reputation_rank?: number;
}

export default function UniversityDetailPage() {
  const params = useParams()
  const [university, setUniversity] = useState<UniversityDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now, use mock data based on ID
    const mockUniversities: UniversityDetails[] = [
      {
        id: '1',
        name: 'Massachusetts Institute of Technology',
        established: '1861',
        students: '11,500+',
        location: 'Cambridge, MA',
        country: 'United States',
        type: 'Private',
        ranking: '#1 Worldwide',
        description: 'World-renowned institute for science, engineering, and technology education and research.',
        programs: 'Engineering, Computer Science, Physics, Mathematics, Economics',
        website: 'www.mit.edu',
        employer_reputation_rank: 1,
        academic_reputation_rank: 1
      },
      {
        id: '2',
        name: 'Stanford University',
        established: '1891',
        students: '17,000+',
        location: 'Stanford, CA',
        country: 'United States',
        type: 'Private',
        ranking: '#2 Worldwide',
        description: 'Leading research university known for innovation and entrepreneurship.',
        programs: 'Engineering, Business, Medicine, Law, Liberal Arts',
        website: 'www.stanford.edu',
        employer_reputation_rank: 2,
        academic_reputation_rank: 2
      },
      {
        id: '3',
        name: 'Harvard University',
        established: '1636',
        students: '23,000+',
        location: 'Cambridge, MA',
        country: 'United States',
        type: 'Private',
        ranking: '#3 Worldwide',
        description: 'Oldest institution of higher education in the United States.',
        programs: 'Law, Business, Medicine, Arts & Sciences, Engineering',
        website: 'www.harvard.edu',
        employer_reputation_rank: 3,
        academic_reputation_rank: 3
      }
    ]

    // Simulate loading university data
    setTimeout(() => {
      const foundUniversity = mockUniversities.find(u => u.id === params.id) || {
        id: params.id as string,
        name: `University #${params.id}`,
        established: '1900',
        students: '10,000+',
        location: 'Global',
        country: 'International',
        type: 'Public',
        ranking: `#${params.id} Worldwide`,
        description: 'A prestigious institution dedicated to excellence in education and research.',
        programs: 'Various undergraduate and graduate programs',
        website: 'www.university.edu',
        employer_reputation_rank: Number(params.id),
        academic_reputation_rank: Number(params.id)
      }
      setUniversity(foundUniversity)
      setLoading(false)
    }, 500)
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

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="sticky top-0 z-10 bg-background border-b p-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Link href="/universities">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Universities
          </Button>
        </Link>
      </motion.div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Image Section - 70% */}
        <motion.div 
          className="lg:w-[70%] w-full h-[400px] lg:h-full relative bg-muted"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <Image
            src={`https://picsum.photos/seed/${university.id}/1200/800`}
            alt={university.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">{university.name}</h1>
            <p className="text-xl">{university.location}</p>
          </div>
        </motion.div>

        {/* Info Section - 30% */}
        <motion.div 
          className="lg:w-[30%] w-full overflow-y-auto"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="p-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Overview</h2>
                <p className="text-muted-foreground">{university.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Key Information</h2>
                
                <div>
                  <p className="text-sm text-muted-foreground">Established</p>
                  <p className="font-medium">{university.established}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{university.type} University</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="font-medium">{university.students}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Ranking</p>
                  <p className="font-medium">{university.ranking}</p>
                </div>

                {university.employer_reputation_rank && (
                  <div>
                    <p className="text-sm text-muted-foreground">Employer Reputation</p>
                    <p className="font-medium">#{university.employer_reputation_rank}</p>
                  </div>
                )}

                {university.academic_reputation_rank && (
                  <div>
                    <p className="text-sm text-muted-foreground">Academic Reputation</p>
                    <p className="font-medium">#{university.academic_reputation_rank}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Popular Programs</h2>
                <p className="text-muted-foreground">{university.programs}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Contact</h2>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a 
                    href={`https://${university.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {university.website}
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="pb-6">
              <Button className="w-full" size="lg">
                Apply Now
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}