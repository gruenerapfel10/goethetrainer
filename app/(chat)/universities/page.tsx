'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Grid3X3, List, Search } from "lucide-react";
import { useRouter } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { UniversityCard } from '@/components/universities/university-card';
import { UniversityFilters } from '@/components/universities/university-filters';
import { UniversityTable } from '@/components/universities/university-table';

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedDegree, setSelectedDegree] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<Record<number, ApplicationStatus>>({});
  const itemsPerPage = 24;
  const t = useTranslations();
  const router = useRouter();
  
  // Hardcoded deadline for all universities
  const applicationDeadline = 'October 31';

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

  // Get unique countries for filter
  const countries = Array.from(new Set(universities.map(u => u.country))).sort();

  // Filter universities
  const filteredUniversities = universities.filter(uni => {
    const matchesSearch = uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         uni.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || uni.country === selectedCountry;
    const matchesDegree = selectedDegree === 'all' || 
                         (uni.supported_degrees && uni.supported_degrees.includes(selectedDegree));
    return matchesSearch && matchesCountry && matchesDegree;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUniversities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUniversities = filteredUniversities.slice(startIndex, startIndex + itemsPerPage);


  const handleUniversityClick = (university: University) => {
    router.push(`/universities/${university.rank}`);
  };


  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="space-y-4">
          <div className="h-6 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="h-[280px]">
              <CardHeader>
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                  <div className="h-5 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>
            {t('common.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  if (!loading && filteredUniversities.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t('universities.title')}</h2>
            <p className="text-muted-foreground">{t('universities.subtitle')}</p>
          </div>
        </div>
        <UniversityFilters
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          selectedCountry={selectedCountry}
          onCountryChange={(value) => {
            setSelectedCountry(value);
            setCurrentPage(1);
          }}
          selectedDegree={selectedDegree}
          onDegreeChange={(value) => {
            setSelectedDegree(value);
            setCurrentPage(1);
          }}
          countries={countries}
          degrees={degrees}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t('universities.noResults')}</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedCountry('all');
                setSelectedDegree('all');
                setCurrentPage(1);
              }}
            >
              {t('universities.clearFilters')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{t('universities.title')}</h2>
            <p className="text-foreground/80">
              {t('universities.subtitle')}
            </p>
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-primary dark:bg-blue-600 border-0 text-primary-foreground dark:text-white' : ''}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'bg-primary dark:bg-blue-600 border-0 text-primary-foreground dark:text-white' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <UniversityFilters
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        selectedCountry={selectedCountry}
        onCountryChange={(value) => {
          setSelectedCountry(value);
          setCurrentPage(1);
        }}
        selectedDegree={selectedDegree}
        onDegreeChange={(value) => {
          setSelectedDegree(value);
          setCurrentPage(1);
        }}
        countries={countries}
        degrees={degrees}
      />

      {/* Results count */}
      <p className="text-sm text-foreground/70">
        {t('universities.showingResults', { current: paginatedUniversities.length, total: filteredUniversities.length })}
      </p>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedUniversities.map((university) => (
            <UniversityCard 
              key={`${university.rank}-${university.name}`} 
              university={university} 
              status={applicationStatuses[university.rank]}
              onClick={handleUniversityClick}
              applicationDeadline={applicationDeadline}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <UniversityTable
          universities={paginatedUniversities}
          applicationStatuses={applicationStatuses}
          applicationDeadline={applicationDeadline}
          onUniversityClick={handleUniversityClick}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(pageNum);
                    }}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      </div>
    </div>
  );
}