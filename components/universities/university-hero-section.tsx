'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Globe, Award, ChevronRight, Search } from "lucide-react";
import { useTranslations } from 'next-intl';

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

interface UniversityHeroSectionProps {
  totalUniversities: number;
  topUniversities: University[];
  onExploreClick: () => void;
  onSearchFocus: () => void;
}

export function UniversityHeroSection({ 
  totalUniversities, 
  topUniversities, 
  onExploreClick, 
  onSearchFocus 
}: UniversityHeroSectionProps) {
  const t = useTranslations();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const stats = [
    { icon: Globe, label: "Universities", value: totalUniversities.toLocaleString(), trend: "+12%" },
    { icon: Users, label: "Countries", value: "50+", trend: "+5%" },
    { icon: Award, label: "Top 100", value: "100", trend: "Updated" },
    { icon: TrendingUp, label: "Rankings", value: "2024", trend: "Latest" }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-950/10 border-b">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM0MTY5RTEiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMiI+PC9jaXJjbGU+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
      </div>

      <div className="relative px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {t('universities.updated2024')}
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                  Discover Your Perfect
                  <span className="block text-blue-600 dark:text-blue-400">University Match</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                  Explore top-ranked universities worldwide with intelligent filtering, 
                  personalized recommendations, and comprehensive insights.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={onExploreClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white group"
                >
                  Explore Universities
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={onSearchFocus}
                  className="group"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Quick Search
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div 
                      key={stat.label}
                      className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-blue-100 dark:border-blue-900/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className="text-xs text-green-600 dark:text-green-400">{stat.trend}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content - Top Universities Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Top Universities</h3>
                <Button variant="ghost" size="sm" onClick={onExploreClick}>
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {topUniversities.slice(0, 5).map((university, index) => (
                  <div
                    key={university.rank}
                    className={`group relative bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 cursor-pointer ${
                      hoveredIndex === index 
                        ? 'border-blue-300 dark:border-blue-600 shadow-lg scale-[1.02]' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
                    }`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            #{university.rank}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {university.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">{university.country}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}