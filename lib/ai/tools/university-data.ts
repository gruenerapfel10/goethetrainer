import { tool } from 'ai';
import { z } from 'zod/v3';
import fs from 'fs';
import path from 'path';

// Types for our data structures
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

interface UniversityData {
  universities: University[];
  degrees: Degree[];
}

// Cache for the data to avoid repeated file reads
let universityDataCache: UniversityData | null = null;

// Load university and degree data
function loadUniversityData(): UniversityData {
  if (universityDataCache) {
    return universityDataCache;
  }

  try {
    // Load universities data
    const universitiesPath = path.join(process.cwd(), 'public', '500.json');
    const universitiesRaw = fs.readFileSync(universitiesPath, 'utf-8');
    const universities: University[] = JSON.parse(universitiesRaw);

    // Load degrees data
    const degreesPath = path.join(process.cwd(), 'public', 'valid_degrees.json');
    const degreesRaw = fs.readFileSync(degreesPath, 'utf-8');
    const degreesData = JSON.parse(degreesRaw);
    const degrees: Degree[] = degreesData.degrees;

    universityDataCache = { universities, degrees };
    return universityDataCache;
  } catch (error) {
    console.error('Error loading university data:', error);
    throw new Error('Failed to load university and degree data');
  }
}

// Search universities by various criteria
export const searchUniversities = tool({
  description: 'Search for universities from the top 500 worldwide rankings. Can filter by country, rank range, supported degrees, or search by name.',
  inputSchema: z.object({
    query: z.string().optional().describe('Search term to match against university names (case-insensitive)'),
    country: z.string().optional().describe('Filter by specific country (e.g., "United States of America", "United Kingdom", "Canada")'),
    minRank: z.number().min(1).max(500).optional().describe('Minimum rank (1 = best)'),
    maxRank: z.number().min(1).max(500).optional().describe('Maximum rank (500 = lowest)'),
    supportedDegree: z.string().optional().describe('Filter universities that support a specific degree ID (e.g., "comp-science", "medicine")'),
    limit: z.number().min(1).max(100).default(10).describe('Maximum number of results to return'),
  }),
  execute: async ({ query, country, minRank, maxRank, supportedDegree, limit }) => {
    const data = loadUniversityData();
    let results = data.universities;

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(uni => 
        uni.name.toLowerCase().includes(searchTerm)
      );
    }

    if (country) {
      results = results.filter(uni => 
        uni.country.toLowerCase() === country.toLowerCase()
      );
    }

    if (minRank !== undefined) {
      results = results.filter(uni => uni.rank >= minRank);
    }

    if (maxRank !== undefined) {
      results = results.filter(uni => uni.rank <= maxRank);
    }

    if (supportedDegree) {
      results = results.filter(uni => 
        uni.supported_degrees && uni.supported_degrees.includes(supportedDegree)
      );
    }

    // Sort by rank (lower is better)
    results.sort((a, b) => a.rank - b.rank);

    // Limit results
    results = results.slice(0, limit);

    return {
      total_found: results.length,
      universities: results.map(uni => ({
        name: uni.name,
        country: uni.country,
        overall_rank: uni.rank,
        employer_reputation_rank: uni.employer_reputation_rank,
        academic_reputation_rank: uni.academic_reputation_rank,
        supported_degrees_count: uni.supported_degrees?.length || 0,
        supported_degrees: uni.supported_degrees || []
      }))
    };
  },
});

// Search and get degree information
export const searchDegrees = tool({
  description: 'Search for degree programs and get detailed information about available degrees, their categories, and aliases.',
  inputSchema: z.object({
    query: z.string().optional().describe('Search term to match against degree names or aliases (case-insensitive)'),
    category: z.string().optional().describe('Filter by degree category (e.g., "STEM", "Business & Management", "Health & Medicine")'),
    level: z.string().optional().describe('Filter by degree level (e.g., "undergraduate", "masters", "phd")'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum number of results to return'),
  }),
  execute: async ({ query, category, level, limit }) => {
    const data = loadUniversityData();
    let results = data.degrees;

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(degree => 
        degree.name.toLowerCase().includes(searchTerm) ||
        degree.aliases.some(alias => alias.toLowerCase().includes(searchTerm)) ||
        degree.id.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      results = results.filter(degree => 
        degree.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (level) {
      results = results.filter(degree => 
        degree.level.toLowerCase() === level.toLowerCase()
      );
    }

    // Sort by popularity rank (lower is more popular)
    results.sort((a, b) => a.popularity_rank - b.popularity_rank);

    // Limit results
    results = results.slice(0, limit);

    return {
      total_found: results.length,
      degrees: results.map(degree => ({
        id: degree.id,
        name: degree.name,
        level: degree.level,
        category: degree.category,
        aliases: degree.aliases,
        popularity_rank: degree.popularity_rank
      }))
    };
  },
});

// Get universities that offer a specific degree
export const getUniversitiesForDegree = tool({
  description: 'Find all universities from the top 500 that offer a specific degree program.',
  inputSchema: z.object({
    degreeId: z.string().describe('The degree ID to search for (e.g., "comp-science", "medicine", "bus-admin")'),
    country: z.string().optional().describe('Optional: Filter by specific country'),
    maxRank: z.number().min(1).max(500).optional().describe('Optional: Only include universities ranked this or better'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum number of results to return'),
  }),
  execute: async ({ degreeId, country, maxRank, limit }) => {
    const data = loadUniversityData();
    
    // Find the degree info first
    const degree = data.degrees.find(d => d.id === degreeId);
    if (!degree) {
      return {
        error: `Degree with ID "${degreeId}" not found`,
        available_degrees: data.degrees.slice(0, 10).map(d => ({ id: d.id, name: d.name }))
      };
    }

    // Find universities that support this degree
    let results = data.universities.filter(uni => 
      uni.supported_degrees && uni.supported_degrees.includes(degreeId)
    );

    // Apply additional filters
    if (country) {
      results = results.filter(uni => 
        uni.country.toLowerCase() === country.toLowerCase()
      );
    }

    if (maxRank !== undefined) {
      results = results.filter(uni => uni.rank <= maxRank);
    }

    // Sort by rank (lower is better)
    results.sort((a, b) => a.rank - b.rank);

    // Limit results
    results = results.slice(0, limit);

    return {
      degree_info: {
        id: degree.id,
        name: degree.name,
        category: degree.category,
        level: degree.level
      },
      total_universities_found: results.length,
      universities: results.map(uni => ({
        name: uni.name,
        country: uni.country,
        overall_rank: uni.rank,
        employer_reputation_rank: uni.employer_reputation_rank,
        academic_reputation_rank: uni.academic_reputation_rank
      }))
    };
  },
});

// Get comprehensive statistics about the university data
export const getUniversityStats = tool({
  description: 'Get comprehensive statistics about the university database including country distribution, degree categories, and ranking insights.',
  inputSchema: z.object({
    includeCountryBreakdown: z.boolean().default(true).describe('Include breakdown by country'),
    includeDegreeCategories: z.boolean().default(true).describe('Include degree category statistics'),
    includeRankingInsights: z.boolean().default(true).describe('Include ranking distribution insights'),
  }),
  execute: async ({ includeCountryBreakdown, includeDegreeCategories, includeRankingInsights }) => {
    const data = loadUniversityData();
    const stats: any = {
      total_universities: data.universities.length,
      total_degrees: data.degrees.length
    };

    if (includeCountryBreakdown) {
      const countryCount: Record<string, number> = {};
      data.universities.forEach(uni => {
        countryCount[uni.country] = (countryCount[uni.country] || 0) + 1;
      });
      
      stats.countries = {
        total_countries: Object.keys(countryCount).length,
        top_countries: Object.entries(countryCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([country, count]) => ({ country, universities: count }))
      };
    }

    if (includeDegreeCategories) {
      const categoryCount: Record<string, number> = {};
      data.degrees.forEach(degree => {
        categoryCount[degree.category] = (categoryCount[degree.category] || 0) + 1;
      });

      stats.degree_categories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => ({ category, degrees: count }));
    }

    if (includeRankingInsights) {
      const top50 = data.universities.filter(uni => uni.rank <= 50).length;
      const top100 = data.universities.filter(uni => uni.rank <= 100).length;
      const top200 = data.universities.filter(uni => uni.rank <= 200).length;

      stats.ranking_distribution = {
        top_50: top50,
        top_100: top100,
        top_200: top200,
        remaining: data.universities.length - top200
      };
    }

    return stats;
  },
});