'use client';

import { motion } from 'framer-motion';
import { GraduationCap, MapPin, Trophy, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UniversityResult {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank?: number;
  academic_reputation_rank?: number;
  supported_degrees?: string[];
  location?: string;
  type?: string;
}

interface UniversitySearchHandlerProps {
  result: {
    universities?: UniversityResult[];
    total?: number;
    query?: string;
  };
  isLoading?: boolean;
}

export function UniversitySearchHandler({ result, isLoading }: UniversitySearchHandlerProps) {
  if (isLoading) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground font-medium">
            Searching universities...
          </span>
        </div>
      </motion.div>
    );
  }

  if (!result?.universities?.length) {
    return (
      <motion.div
        className="mb-4 p-4 border rounded-xl bg-muted/10"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <span className="text-sm">No universities found for your search.</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Found {result.universities.length} universities
          {result.total && result.total > result.universities.length && ` (showing first ${result.universities.length} of ${result.total})`}
        </span>
      </div>
      
      <div className="space-y-3">
        {result.universities.slice(0, 5).map((university, index) => (
          <motion.div
            key={`${university.name}-${university.rank}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2">
                      {university.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {university.country}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3 w-3 text-yellow-500" />
                    <Badge variant="secondary" className="text-xs">
                      #{university.rank}
                    </Badge>
                  </div>
                </div>
                
                {(university.employer_reputation_rank || university.academic_reputation_rank) && (
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    {university.employer_reputation_rank && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Employer: #{university.employer_reputation_rank}</span>
                      </div>
                    )}
                    {university.academic_reputation_rank && (
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        <span>Academic: #{university.academic_reputation_rank}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {university.supported_degrees && university.supported_degrees.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {university.supported_degrees.slice(0, 3).map((degree, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {degree}
                      </Badge>
                    ))}
                    {university.supported_degrees.length > 3 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{university.supported_degrees.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {result.universities.length > 5 && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-xs text-muted-foreground">
            and {result.universities.length - 5} more universities...
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}