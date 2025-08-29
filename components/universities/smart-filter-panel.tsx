'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Filter, 
  X, 
  Search, 
  MapPin, 
  Trophy, 
  Users,
  TrendingUp,
  BookOpen,
  Building
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

interface Degree {
  id: string;
  name: string;
  level: string;
  category: string;
  aliases: string[];
  popularity_rank: number;
}

interface SmartFilterPanelProps {
  universities: University[];
  degrees: Degree[];
  filters: {
    search: string;
    rankRange: [number, number];
    countries: string[];
    degrees: string[];
    category: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SmartFilterPanel({
  universities,
  degrees,
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle
}: SmartFilterPanelProps) {
  const t = useTranslations();
  
  // Get unique countries and sort by university count
  const countryStats = universities.reduce((acc, uni) => {
    acc[uni.country] = (acc[uni.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedCountries = Object.entries(countryStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 12);

  // Get popular degree categories
  const degreeCategories = degrees.reduce((acc, degree) => {
    if (!acc[degree.category]) {
      acc[degree.category] = [];
    }
    acc[degree.category].push(degree);
    return acc;
  }, {} as Record<string, Degree[]>);

  const popularCategories = Object.keys(degreeCategories).slice(0, 8);

  const updateFilters = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCountry = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country];
    updateFilters('countries', newCountries);
  };

  const toggleDegree = (degreeId: string) => {
    const newDegrees = filters.degrees.includes(degreeId)
      ? filters.degrees.filter(d => d !== degreeId)
      : [...filters.degrees, degreeId];
    updateFilters('degrees', newDegrees);
  };

  const activeFiltersCount = 
    (filters.search ? 1 : 0) +
    (filters.countries.length > 0 ? 1 : 0) +
    (filters.degrees.length > 0 ? 1 : 0) +
    (filters.rankRange[0] > 1 || filters.rankRange[1] < 500 ? 1 : 0);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="fixed top-20 right-4 z-50 shadow-lg bg-background border-2"
      >
        <Filter className="w-4 h-4 mr-2" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-xl z-50 overflow-y-auto">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Smart Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Universities
            </label>
            <Input
              placeholder="Type university name..."
              value={filters.search}
              onChange={(e) => updateFilters('search', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Ranking Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Ranking Range
            </label>
            <div className="px-2">
              <Slider
                value={filters.rankRange}
                onValueChange={(value) => updateFilters('rankRange', value)}
                max={500}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>#{filters.rankRange[0]}</span>
                <span>#{filters.rankRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Popular Countries */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Countries ({filters.countries.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sortedCountries.map(([country, count]) => (
                <Button
                  key={country}
                  variant={filters.countries.includes(country) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCountry(country)}
                  className="justify-start text-xs h-8 px-2"
                >
                  <span className="truncate">{country}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1">
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Categories */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building className="w-4 h-4" />
              Quick Categories
            </label>
            <div className="grid gap-2">
              <Button
                variant={filters.category === 'top-10' ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters('category', filters.category === 'top-10' ? '' : 'top-10')}
                className="justify-start text-xs"
              >
                <Trophy className="w-3 h-3 mr-2" />
                Top 10 Global
              </Button>
              <Button
                variant={filters.category === 'top-50' ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters('category', filters.category === 'top-50' ? '' : 'top-50')}
                className="justify-start text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-2" />
                Top 50 Excellence
              </Button>
              <Button
                variant={filters.category === 'rising' ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters('category', filters.category === 'rising' ? '' : 'rising')}
                className="justify-start text-xs"
              >
                <Users className="w-3 h-3 mr-2" />
                Rising Stars (51-100)
              </Button>
            </div>
          </div>

          {/* Degree Categories */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Degree Focus ({filters.degrees.length} selected)
            </label>
            <div className="grid gap-2">
              {popularCategories.map((category) => {
                const categoryDegrees = degreeCategories[category];
                const hasSelected = categoryDegrees.some(d => filters.degrees.includes(d.id));
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {category}
                    </div>
                    <div className="grid gap-1">
                      {categoryDegrees.slice(0, 3).map((degree) => (
                        <Button
                          key={degree.id}
                          variant={filters.degrees.includes(degree.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDegree(degree.id)}
                          className="justify-start text-xs h-7 px-2"
                        >
                          <span className="truncate">{degree.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm font-medium">Active Filters</div>
              <div className="flex flex-wrap gap-1">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {filters.search}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => updateFilters('search', '')}
                    />
                  </Badge>
                )}
                {filters.countries.map(country => (
                  <Badge key={country} variant="secondary" className="text-xs">
                    {country}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => toggleCountry(country)}
                    />
                  </Badge>
                ))}
                {(filters.rankRange[0] > 1 || filters.rankRange[1] < 500) && (
                  <Badge variant="secondary" className="text-xs">
                    Rank: #{filters.rankRange[0]}-#{filters.rankRange[1]}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => updateFilters('rankRange', [1, 500])}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}