import { useState, useEffect, useCallback, useRef } from 'react';
import type { TopUseCaseCategory } from '@/components/dashboard/top-use-cases/common/types';
import { fetchCategoriesAPI } from '../services/api';
import type { FetchCategoriesParams } from '../services/api';

export interface UseCaseSearchData {
  categories: TopUseCaseCategory[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCategories: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  refreshData: () => Promise<void>; // New refresh function
}

export function useUseCaseSearch(
  initialPageSize = 10,
): UseCaseSearchData {
  const [categories, setCategories] = useState<TopUseCaseCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCategories, setTotalCategories] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Debounce search input to prevent excessive API calls
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useRef<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: FetchCategoriesParams = {
        page: currentPage,
        limit: initialPageSize,
        query: debouncedSearch.current,
        filter: 'all', // Search in both categories and use cases
      };

      const data = await fetchCategoriesAPI(params);

      setCategories(data.categories || []);
      setTotalCategories(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch categories');
      console.error('[useUseCaseSearch] Failed to fetch categories:', error);
      setError(error);
      setCategories([]);
      setTotalCategories(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, initialPageSize]);

  // Add explicit refresh function that can be called from outside
  const refreshData = useCallback(async () => {
    // Reset any error state
    setError(null);
    // Use current values when refreshing
    debouncedSearch.current = searchQuery;
    await fetchData();
  }, [fetchData, searchQuery]);

  // Handle search query changes with debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      // Only reset to page 1 if the search query actually changed
      if (debouncedSearch.current !== searchQuery) {
        debouncedSearch.current = searchQuery;
        setCurrentPage(1); // Reset to first page when search changes
        fetchData();
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, fetchData]);

  // Fetch when page changes (but not when search changes, as that's handled above)
  useEffect(() => {
    // Store current search value to prevent double fetching
    const currentSearch = debouncedSearch.current;

    // Update the debounced search without triggering the search effect
    if (currentSearch !== searchQuery) {
      debouncedSearch.current = searchQuery;
    }

    fetchData();
  }, [currentPage, fetchData]);

  return {
    categories,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    totalCategories,
    totalPages,
    currentPage,
    setCurrentPage,
    refreshData, // Return the refresh function
  };
}
