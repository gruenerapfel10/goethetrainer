'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Globe, 
  TrendingUp, 
  Star, 
  ChevronRight,
  MapPin,
  Users,
  Award
} from "lucide-react";
import { useTranslations } from 'next-intl';

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

interface CategorySection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  universities: University[];
  gradient: string;
}

interface UniversityCategoriesProps {
  universities: University[];
  onCategoryClick: (categoryId: string, universities: University[]) => void;
  onUniversityClick: (university: University) => void;
}

export function UniversityCategories({ 
  universities, 
  onCategoryClick, 
  onUniversityClick 
}: UniversityCategoriesProps) {
  const t = useTranslations();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Group universities into categories
  const categories: CategorySection[] = [
    {
      id: 'top-10',
      title: 'Global Top 10',
      description: 'World\'s most prestigious universities',
      icon: Trophy,
      color: 'text-yellow-600 dark:text-yellow-400',
      gradient: 'from-yellow-500/10 to-orange-500/10',
      universities: universities.filter(u => u.rank <= 10)
    },
    {
      id: 'top-50',
      title: 'Top 50 Excellence',
      description: 'Elite institutions worldwide',
      icon: Star,
      color: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-500/10 to-purple-500/10',
      universities: universities.filter(u => u.rank <= 50 && u.rank > 10)
    },
    {
      id: 'rising-stars',
      title: 'Rising Stars',
      description: 'Fast-climbing universities',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-500/10 to-emerald-500/10',
      universities: universities.filter(u => u.rank <= 100 && u.rank > 50)
    },
    {
      id: 'by-region',
      title: 'By Region',
      description: 'Explore by geographic area',
      icon: Globe,
      color: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-500/10 to-pink-500/10',
      universities: universities.slice(0, 20) // Sample for regions
    }
  ];

  // Get top countries by university count
  const topCountries = universities.reduce((acc, uni) => {
    acc[uni.country] = (acc[uni.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCountries = Object.entries(topCountries)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Category Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                hoveredCard === category.id 
                  ? 'border-blue-300 dark:border-blue-600 scale-[1.02]' 
                  : 'border-border hover:border-blue-200 dark:hover:border-blue-700'
              }`}
              onMouseEnter={() => setHoveredCard(category.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => onCategoryClick(category.id, category.universities)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${category.color}`} />
                </div>
                <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {category.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {category.universities.length} Universities
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                
                {/* Preview universities */}
                <div className="mt-4 space-y-2">
                  {category.universities.slice(0, 3).map((uni) => (
                    <div 
                      key={uni.rank}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUniversityClick(uni);
                      }}
                    >
                      <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                        {uni.rank}
                      </span>
                      <span className="truncate">{uni.name}</span>
                    </div>
                  ))}
                  {category.universities.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{category.universities.length - 3} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access Regions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Popular Regions</h3>
          <Button 
            variant="ghost" 
            onClick={() => onCategoryClick('all-regions', universities)}
          >
            View All Regions <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedCountries.map(([country, count]) => {
            const countryUniversities = universities.filter(u => u.country === country);
            return (
              <Card
                key={country}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border hover:border-blue-200 dark:hover:border-blue-700"
                onClick={() => onCategoryClick(`region-${country}`, countryUniversities)}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {country}
                  </h4>
                  <p className="text-xs text-muted-foreground">{count} universities</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl p-6 border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {universities.filter(u => u.rank <= 10).length}
            </div>
            <div className="text-sm text-muted-foreground">Top 10 Global</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Object.keys(topCountries).length}
            </div>
            <div className="text-sm text-muted-foreground">Countries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {universities.filter(u => u.rank <= 100).length}
            </div>
            <div className="text-sm text-muted-foreground">Top 100</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {universities.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Universities</div>
          </div>
        </div>
      </div>
    </div>
  );
}