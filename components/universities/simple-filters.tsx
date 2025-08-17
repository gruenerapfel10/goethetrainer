'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface University {
  name: string;
  country: string;
  rank: number;
  employer_reputation_rank: number;
  academic_reputation_rank: number;
  supported_degrees?: string[];
}

interface SimpleFiltersProps {
  universities: University[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  rankFilter: string;
  onRankFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function SimpleFilters({
  universities,
  searchTerm,
  onSearchChange,
  selectedCountry,
  onCountryChange,
  rankFilter,
  onRankFilterChange,
  onClearFilters
}: SimpleFiltersProps) {
  const countries = Array.from(new Set(universities.map(u => u.country))).sort();
  
  const hasActiveFilters = searchTerm || selectedCountry !== 'all' || rankFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search universities..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCountry} onValueChange={onCountryChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map(country => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rankFilter} onValueChange={onRankFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All rankings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rankings</SelectItem>
            <SelectItem value="top-10">Top 10</SelectItem>
            <SelectItem value="top-50">Top 50</SelectItem>
            <SelectItem value="top-100">Top 100</SelectItem>
            <SelectItem value="100-plus">100+</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="secondary">
              Search: {searchTerm}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          {selectedCountry !== 'all' && (
            <Badge variant="secondary">
              {selectedCountry}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onCountryChange('all')}
              />
            </Badge>
          )}
          {rankFilter !== 'all' && (
            <Badge variant="secondary">
              {rankFilter.replace('-', ' ').replace('plus', '+')}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onRankFilterChange('all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}