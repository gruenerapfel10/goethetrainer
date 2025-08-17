'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MoreHorizontal, MapPin, Trophy } from "lucide-react";
import { useRouter } from 'next/navigation';

interface University {
  id: string;
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
  requirements?: {
    us?: CountryRequirements;
    gb?: CountryRequirements;
    ru?: CountryRequirements;
  };
}

interface CountryRequirements {
  academic_requirements: Record<string, any>;
  language_requirements: Record<string, any>;
  application_requirements: Record<string, any>;
  deadlines: Record<string, any>;
  additional_requirements: string[];
}

interface Degree {
  id: string;
  name: string;
  level: string;
  category: string;
  aliases: string[];
  popularity_rank: number;
}

type ApplicationStatus = 'not_applied' | 'applied' | 'accepted' | 'rejected';

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<Record<number, ApplicationStatus>>({});
  const itemsPerPage = 50;
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();

  // Map locale to requirements country code
  const getRequirementsCountryCode = (locale: string): string => {
    switch (locale) {
      case 'ru':
        return 'ru'; // Russian nationals
      case 'en':
        return 'us'; // Default to US for English
      case 'lt':
        return 'gb'; // Lithuanian -> UK (closest European system)
      default:
        return 'us'; // Default fallback
    }
  };

  const requirementsCountryCode = getRequirementsCountryCode(locale);

  useEffect(() => {
    Promise.all([
      fetch('/500.json').then(res => res.json()),
      fetch('/valid_degrees.json').then(res => res.json())
    ])
      .then(([universitiesData, degreesData]) => {
        setUniversities(universitiesData);
        setDegrees(degreesData.degrees);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError('Failed to load universities data. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filteredUniversities = universities.filter(uni => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = uni.name.toLowerCase().includes(searchLower) ||
                           uni.country.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (selectedCountry !== 'all' && uni.country !== selectedCountry) {
      return false;
    }

    if (rankFilter !== 'all') {
      switch (rankFilter) {
        case 'top-50':
          return uni.rank <= 50;
        case 'top-100':
          return uni.rank <= 100;
        case '100-plus':
          return uni.rank > 100;
        default:
          return true;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredUniversities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUniversities = filteredUniversities.slice(startIndex, startIndex + itemsPerPage);

  const countries = Array.from(new Set(universities.map(u => u.country))).sort();
  
  // Get university count per country
  const getCountryCount = (country: string) => {
    return universities.filter(u => u.country === country).length;
  };

  const getStatusBadge = (status: ApplicationStatus | undefined) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Applied</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-muted animate-pulse rounded w-48 mb-2"></div>
          <div className="h-5 bg-muted/50 animate-pulse rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 animate-pulse rounded border"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground mb-2">Universities</h1>
              <p className="text-muted-foreground">{universities.length} universities • {countries.length} countries</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Requirements for:</span>
              <Badge variant="secondary" className="text-xs">
                {requirementsCountryCode === 'us' && '🇺🇸 US Nationals'}
                {requirementsCountryCode === 'gb' && '🇬🇧 UK/EU Nationals'}
                {requirementsCountryCode === 'ru' && '🇷🇺 Russian Nationals'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search universities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries ({universities.length})</SelectItem>
              {countries.map(country => (
                <SelectItem key={country} value={country}>
                  {country} ({getCountryCount(country)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ranking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ranks</SelectItem>
              <SelectItem value="top-50">Top 50</SelectItem>
              <SelectItem value="top-100">Top 100</SelectItem>
              <SelectItem value="100-plus">100+</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || selectedCountry !== 'all' || rankFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm('');
                setSelectedCountry('all');
                setRankFilter('all');
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredUniversities.length} results
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredUniversities.length)} of {filteredUniversities.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">University</th>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">Country</th>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">Employer Rep</th>
                <th className="text-left py-3 px-4 font-medium text-foreground text-sm">Academic Rep</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedUniversities.map((university) => (
                <tr 
                  key={`${university.rank}-${university.name}`}
                  className="hover:bg-muted/50 cursor-pointer group"
                  onClick={() => router.push(`/universities/${university.id}?nationality=${requirementsCountryCode}`)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">#{university.rank}</span>
                      {university.rank <= 10 && <Trophy className="h-3 w-3 text-amber-500" />}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-foreground">{university.name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {university.country}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(applicationStatuses[university.rank])}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm text-muted-foreground">#{university.employer_reputation_rank}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm text-muted-foreground">#{university.academic_reputation_rank}</span>
                  </td>
                  <td className="py-4 px-4">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className=""
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                if (pageNum < 1 || pageNum > totalPages) return null;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className=""
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className=""
            >
              Next
            </Button>
          </div>
        )}

        {/* Empty state */}
        {filteredUniversities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No universities found</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedCountry('all');
                setRankFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
    </div>
  );
}