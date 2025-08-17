'use client';

import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTranslations } from 'next-intl';

interface Degree {
  id: string;
  name: string;
  level: string;
  category: string;
  aliases: string[];
  popularity_rank: number;
}

interface UniversityFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  selectedDegree: string;
  onDegreeChange: (value: string) => void;
  countries: string[];
  degrees: Degree[];
}

export function UniversityFilters({
  searchTerm,
  onSearchChange,
  selectedCountry,
  onCountryChange,
  selectedDegree,
  onDegreeChange,
  countries,
  degrees
}: UniversityFiltersProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('universities.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={selectedCountry} onValueChange={onCountryChange}>
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder={t('universities.filterByCountry')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('universities.allCountries')}</SelectItem>
          {countries.map(country => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedDegree} onValueChange={onDegreeChange}>
        <SelectTrigger className="w-full md:w-[250px]">
          <SelectValue placeholder={t('universities.filterByDegree')} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectItem value="all">{t('universities.allDegrees')}</SelectItem>
          {degrees.sort((a, b) => a.popularity_rank - b.popularity_rank).map(degree => (
            <SelectItem key={degree.id} value={degree.id}>
              {degree.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}