'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Trophy, Users } from "lucide-react";

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

interface UniversityOverviewProps {
  universities: University[];
  onViewCategory: (filter: any) => void;
}

export function UniversityOverview({ universities, onViewCategory }: UniversityOverviewProps) {
  const totalCount = universities.length;
  const countries = [...new Set(universities.map(u => u.country))];
  const topTierCount = universities.filter(u => u.rank <= 50).length;

  const countryGroups = countries
    .map(country => ({
      country,
      count: universities.filter(u => u.country === country).length,
      topUniversity: universities
        .filter(u => u.country === country)
        .sort((a, b) => a.rank - b.rank)[0]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewCategory({ maxRank: 50 })}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              Top 50 Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{topTierCount}</p>
            <p className="text-sm text-muted-foreground">Universities</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewCategory({})}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              All Universities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total available</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewCategory({})}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{countries.length}</p>
            <p className="text-sm text-muted-foreground">Regions covered</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Browse by Country</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {countryGroups.map(({ country, count, topUniversity }) => (
            <Card 
              key={country}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onViewCategory({ country })}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{country}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best: #{topUniversity.rank} {topUniversity.name.slice(0, 30)}
                  {topUniversity.name.length > 30 ? '...' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Button 
          onClick={() => onViewCategory({})}
          variant="outline" 
          className="w-full"
        >
          View All Universities
        </Button>
      </div>
    </div>
  );
}