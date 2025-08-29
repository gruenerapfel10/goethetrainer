'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
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
import { Search, Filter, MoreHorizontal, MapPin, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

type SortField = 'rank' | 'name' | 'country' | 'employer_reputation_rank' | 'academic_reputation_rank';
type SortOrder = 'asc' | 'desc';

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
  const [userNationality, setUserNationality] = useState('us');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const itemsPerPage = 50;
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();

  // Helper function to get university emblem path
  const getUniversityEmblemPath = (name: string) => {
    const path = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
    return `/university-images/${path}/emblem_${path}.svg`;
  };

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

  // Load user's nationality preference
  useEffect(() => {
    if (user?.uid) {
      profileService.getProfile(user.uid)
        .then(profile => {
          if (profile?.nationality) {
            setUserNationality(profile.nationality);
          }
        })
        .catch(err => {
          console.error('Failed to load user nationality preference:', err);
        });
    }
  }, [user?.uid]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="ml-1 h-4 w-4 text-foreground" />
      : <ChevronDown className="ml-1 h-4 w-4 text-foreground" />;
  };

  const sortedAndFilteredUniversities = universities
    .filter(uni => {
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
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'country':
          aValue = a.country.toLowerCase();
          bValue = b.country.toLowerCase();
          break;
        case 'employer_reputation_rank':
          aValue = a.employer_reputation_rank;
          bValue = b.employer_reputation_rank;
          break;
        case 'academic_reputation_rank':
          aValue = a.academic_reputation_rank;
          bValue = b.academic_reputation_rank;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const totalPages = Math.ceil(sortedAndFilteredUniversities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUniversities = sortedAndFilteredUniversities.slice(startIndex, startIndex + itemsPerPage);

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
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-none p-4 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground mb-2">Universities</h1>
            <p className="text-muted-foreground">{universities.length} universities • {countries.length} countries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-4">
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
            <SelectTrigger className="w-40 lg:w-48">
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
            <SelectTrigger className="w-32 lg:w-40">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <p className="text-sm text-muted-foreground">
            {sortedAndFilteredUniversities.length} results
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, sortedAndFilteredUniversities.length)} of {sortedAndFilteredUniversities.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container - scrollable */}
      <div className="flex-1 overflow-auto px-4 max-w-7xl mx-auto w-full">
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-16 lg:w-24 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    Rank
                    {getSortIcon('rank')}
                  </button>
                </th>
                <th className="text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    University
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="w-32 lg:w-48 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('country')}
                  >
                    Country
                    {getSortIcon('country')}
                  </button>
                </th>
                <th className="w-16 lg:w-24 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">Status</th>
                <th className="w-20 lg:w-32 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm hidden md:table-cell">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('employer_reputation_rank')}
                  >
                    Emp Rep
                    {getSortIcon('employer_reputation_rank')}
                  </button>
                </th>
                <th className="w-20 lg:w-32 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm hidden lg:table-cell">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('academic_reputation_rank')}
                  >
                    Acad Rep
                    {getSortIcon('academic_reputation_rank')}
                  </button>
                </th>
                <th className="w-8 hidden sm:table-cell"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedUniversities.map((university) => (
                <tr 
                  key={`${university.rank}-${university.name}`}
                  className="hover:bg-muted/50 cursor-pointer group"
                  onClick={() => router.push(`/universities/${university.id}`)}
                >
                  <td className="py-2 lg:py-4 px-2 lg:px-4">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Image
                        src={getUniversityEmblemPath(university.name)}
                        alt={`${university.name} emblem`}
                        width={16}
                        height={16}
                        className="object-contain flex-shrink-0 lg:w-5 lg:h-5"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="font-mono text-xs lg:text-sm text-foreground">#{university.rank}</span>
                    </div>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4">
                    <div className="font-medium text-xs lg:text-sm text-foreground truncate" title={university.name}>
                      {university.name}
                    </div>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4">
                    <div className="flex items-center gap-1 lg:gap-2 text-muted-foreground">
                      <MapPin className="h-2 w-2 lg:h-3 lg:w-3 flex-shrink-0" />
                      <span className="truncate text-xs lg:text-sm" title={university.country}>{university.country}</span>
                    </div>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4">
                    <div className="scale-75 lg:scale-100 origin-left">
                      {getStatusBadge(applicationStatuses[university.rank])}
                    </div>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4 hidden md:table-cell">
                    <span className="font-mono text-xs lg:text-sm text-muted-foreground">#{university.employer_reputation_rank}</span>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4 hidden lg:table-cell">
                    <span className="font-mono text-xs lg:text-sm text-muted-foreground">#{university.academic_reputation_rank}</span>
                  </td>
                  <td className="py-2 lg:py-4 px-2 lg:px-4 hidden sm:table-cell">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 scale-75 lg:scale-100">
                      <MoreHorizontal className="h-3 w-3 lg:h-4 lg:w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - fixed at bottom */}
      <div className="flex-none border-t bg-background px-4 py-3 max-w-7xl mx-auto w-full">
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1 lg:gap-2">
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
                    className="px-2 lg:px-3 text-xs lg:text-sm min-w-8 lg:min-w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Empty state */}
        {sortedAndFilteredUniversities.length === 0 && (
          <div className="text-center py-8">
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
    </div>
  );
}