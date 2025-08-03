'use client';

import React, { useState, useEffect } from 'react';
import { usePageTransition } from '@/context/page-transition-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, List, Search, MapPin, Trophy, Building, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  const { startTransition, isTransitioning } = usePageTransition();
  const [universities, setUniversities] = useState<University[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedDegree, setSelectedDegree] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [applicationStatuses, setApplicationStatuses] = useState<Record<number, ApplicationStatus>>({});
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const itemsPerPage = 24;
  
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

  const getApplicationStatusBadge = (status: ApplicationStatus | undefined) => {
    switch (status) {
      case 'applied':
        return (
          <Badge className="bg-blue-500 text-white border-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Applied
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-500 text-white border-0 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white border-0 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            Not Applied
          </Badge>
        );
    }
  };

  const handleCardClick = (e: React.MouseEvent, university: University) => {
    e.preventDefault();
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    startTransition(`/universities/${university.rank}`, {
      university,
      position: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
  };

  const UniversityCard = ({ university }: { university: University }) => {
    const status = applicationStatuses[university.rank];
    const isHovered = hoveredCard === university.rank;
    
    return (
      <div 
        onClick={(e) => handleCardClick(e, university)}
        onMouseEnter={() => setHoveredCard(university.rank)}
        onMouseLeave={() => setHoveredCard(null)}
        className="relative"
      >
        <Card className={`bg-white/95 backdrop-blur-xl border-0 shadow-blue hover:shadow-blue-lg transition-all duration-300 cursor-pointer group transform-gpu ${
          isHovered ? 'scale-[1.02] -translate-y-1' : ''
        } ${
          isTransitioning ? 'opacity-90' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <Badge className="w-fit bg-gradient-blue text-white border-0">
                  #{university.rank}
                </Badge>
                {getApplicationStatusBadge(status)}
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building className="h-4 w-4 text-white" />
              </div>
            </div>
            <CardTitle className="text-lg line-clamp-2 mt-2">{university.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {university.country}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Employer Rep</span>
                <Badge variant="outline" className="border-primary-blue text-primary-blue">#{university.employer_reputation_rank}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Academic Rep</span>
                <Badge variant="outline" className="border-primary-blue text-primary-blue">#{university.academic_reputation_rank}</Badge>
              </div>
              {university.supported_degrees && selectedDegree !== 'all' && (
                <div className="pt-2 mt-2 border-t">
                  <Badge className={university.supported_degrees.includes(selectedDegree) ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-600 border-gray-300"}>
                    {university.supported_degrees.includes(selectedDegree) ? "✓ Offers selected degree" : "× Degree not available"}
                  </Badge>
                </div>
              )}
              <div className="pt-2 mt-2 border-t">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">Deadline: {applicationDeadline}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading universities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Background blur effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blur-circle"></div>
        <div className="absolute top-60 -left-20 w-80 h-80 bg-blur-circle-light"></div>
        <div className="absolute bottom-40 right-40 w-72 h-72 bg-blur-circle-light"></div>
      </div>
      
      <div className="relative z-10 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Universities</h2>
            <p className="text-muted-foreground">
              Browse and apply to top 500 universities worldwide
            </p>
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-gradient-blue border-0 text-white' : ''}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'bg-gradient-blue border-0 text-white' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search universities or countries..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={selectedCountry} onValueChange={(value) => {
          setSelectedCountry(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(country => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedDegree} onValueChange={(value) => {
          setSelectedDegree(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Filter by degree" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Degrees</SelectItem>
            {degrees.sort((a, b) => a.popularity_rank - b.popularity_rank).map(degree => (
              <SelectItem key={degree.id} value={degree.id}>
                {degree.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginatedUniversities.length} of {filteredUniversities.length} universities
      </p>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedUniversities.map((university) => (
            <UniversityCard key={`${university.rank}-${university.name}`} university={university} />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-blue">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>University</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-center">Employer Rep</TableHead>
                <TableHead className="text-center">Academic Rep</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUniversities.map((university) => {
                const status = applicationStatuses[university.rank];
                return (
                  <TableRow key={`${university.rank}-${university.name}`}>
                    <TableCell>
                      <Badge className="bg-gradient-blue text-white border-0">#{university.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{university.name}</TableCell>
                    <TableCell>{university.country}</TableCell>
                    <TableCell>{getApplicationStatusBadge(status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">{applicationDeadline}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-primary-blue text-primary-blue">#{university.employer_reputation_rank}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-primary-blue text-primary-blue">#{university.academic_reputation_rank}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          startTransition(`/universities/${university.rank}`, { university });
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
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