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
import { Search, Filter, MoreHorizontal, MapPin, ChevronUp, ChevronDown, ChevronsUpDown, Building2, DollarSign, Clock, Briefcase } from "lucide-react";
import { useRouter } from 'next/navigation';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  salary_min?: number;
  salary_max?: number;
  posted_date: string;
  description?: string;
  requirements?: string[];
  remote?: boolean;
  department?: string;
  url?: string;
  source?: string;
}

type ApplicationStatus = 'not_applied' | 'applied' | 'interviewing' | 'offer' | 'rejected';
type SortField = 'title' | 'company' | 'location' | 'posted_date' | 'salary';
type SortOrder = 'asc' | 'desc';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, ApplicationStatus>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('posted_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const itemsPerPage = 50;
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, selectedLocation, selectedType, selectedExperience, currentPage]);

  const fetchJobs = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString(),
      });
      
      if (searchTerm) params.append('keywords', searchTerm);
      if (selectedLocation !== 'all') params.append('location', selectedLocation);
      if (selectedType !== 'all') params.append('jobType', selectedType);
      if (selectedExperience !== 'all') params.append('experienceLevel', selectedExperience);
      
      const response = await fetch(`/api/jobs/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setJobs(data.data.jobs);
        
        // Log provider errors if any
        if (data.data.errors && data.data.errors.length > 0) {
          console.warn('Some job providers failed:', data.data.errors);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="ml-1 h-4 w-4 text-foreground" />
      : <ChevronDown className="ml-1 h-4 w-4 text-foreground" />;
  };

  const sortedAndFilteredJobs = jobs
    .filter(job => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = job.title.toLowerCase().includes(searchLower) ||
                             job.company.toLowerCase().includes(searchLower) ||
                             job.location.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (selectedLocation !== 'all' && job.location !== selectedLocation) {
        return false;
      }

      if (selectedType !== 'all' && job.type !== selectedType) {
        return false;
      }

      if (selectedExperience !== 'all' && job.experience_level !== selectedExperience) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'company':
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'posted_date':
          aValue = new Date(a.posted_date);
          bValue = new Date(b.posted_date);
          break;
        case 'salary':
          aValue = a.salary_max || a.salary_min || 0;
          bValue = b.salary_max || b.salary_min || 0;
          break;
        default:
          return 0;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const totalPages = Math.ceil(sortedAndFilteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = sortedAndFilteredJobs.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: ApplicationStatus | undefined) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Applied</Badge>;
      case 'interviewing':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">Interviewing</Badge>;
      case 'offer':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Offer</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Applied</Badge>;
    }
  };

  const getExperienceBadge = (level: string) => {
    const colors = {
      'entry': 'bg-green-500/10 text-green-600 border-green-500/20',
      'mid': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'senior': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'executive': 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    };
    return <Badge className={colors[level as keyof typeof colors] || 'bg-muted'}>{level}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'full-time': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'part-time': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'contract': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'internship': 'bg-green-500/10 text-green-600 border-green-500/20'
    };
    return <Badge className={colors[type as keyof typeof colors] || 'bg-muted'}>{type.replace('-', ' ')}</Badge>;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-foreground mb-2">Job Opportunities</h1>
              <p className="text-muted-foreground">{jobs.length} job listings available</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setRefreshing(true);
                fetchJobs().finally(() => setRefreshing(false));
              }}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40 lg:w-48">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedExperience} onValueChange={setSelectedExperience}>
            <SelectTrigger className="w-32 lg:w-40">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="entry">Entry Level</SelectItem>
              <SelectItem value="mid">Mid Level</SelectItem>
              <SelectItem value="senior">Senior Level</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || selectedType !== 'all' || selectedExperience !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedExperience('all');
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
            {sortedAndFilteredJobs.length} results
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {jobs.length > 0 
                ? `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, sortedAndFilteredJobs.length)} of ${sortedAndFilteredJobs.length}`
                : 'No jobs to display'
              }
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
                <th className="text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    Job Title
                    {getSortIcon('title')}
                  </button>
                </th>
                <th className="w-48 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('company')}
                  >
                    Company
                    {getSortIcon('company')}
                  </button>
                </th>
                <th className="w-40 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('location')}
                  >
                    Location
                    {getSortIcon('location')}
                  </button>
                </th>
                <th className="w-32 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">Type</th>
                <th className="w-32 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm hidden md:table-cell">Experience</th>
                <th className="w-36 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm hidden lg:table-cell">
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort('salary')}
                  >
                    Salary
                    {getSortIcon('salary')}
                  </button>
                </th>
                <th className="w-24 text-left py-2 px-2 lg:px-4 font-medium text-foreground text-xs lg:text-sm">Status</th>
                <th className="w-8 hidden sm:table-cell"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedJobs.length > 0 ? (
                paginatedJobs.map((job) => (
                  <tr 
                    key={job.id}
                    className="hover:bg-muted/50 cursor-pointer group"
                    onClick={() => {
                      if (job.url) {
                        window.open(job.url, '_blank');
                      } else {
                        router.push(`/jobs/${job.id}`);
                      }
                    }}
                  >
                    <td className="py-2 lg:py-4 px-2 lg:px-4">
                      <div className="font-medium text-xs lg:text-sm text-foreground truncate" title={job.title}>
                        {job.title}
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4">
                      <div className="flex items-center gap-1 lg:gap-2 text-muted-foreground">
                        <Building2 className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                        <span className="truncate text-xs lg:text-sm" title={job.company}>
                          {job.company}
                          {job.source && (
                            <span className="ml-1 text-xs text-muted-foreground/70">({job.source})</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4">
                      <div className="flex items-center gap-1 lg:gap-2 text-muted-foreground">
                        <MapPin className="h-2 w-2 lg:h-3 lg:w-3 flex-shrink-0" />
                        <span className="truncate text-xs lg:text-sm" title={job.location}>{job.location}</span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4">
                      <div className="scale-75 lg:scale-100 origin-left">
                        {getTypeBadge(job.type)}
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4 hidden md:table-cell">
                      <div className="scale-75 lg:scale-100 origin-left">
                        {getExperienceBadge(job.experience_level)}
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4 hidden lg:table-cell">
                      {job.salary_min && job.salary_max ? (
                        <div className="flex items-center gap-1 text-xs lg:text-sm">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground">
                            {`${job.salary_min / 1000}k-${job.salary_max / 1000}k`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4">
                      <div className="scale-75 lg:scale-100 origin-left">
                        {getStatusBadge(applicationStatuses[job.id])}
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-4 hidden sm:table-cell">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 scale-75 lg:scale-100">
                        <MoreHorizontal className="h-3 w-3 lg:h-4 lg:w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Briefcase className="h-12 w-12 text-muted-foreground/50" />
                      <div>
                        <p className="text-muted-foreground font-medium">No jobs available yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for new opportunities</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
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
      </div>
    </div>
  );
}