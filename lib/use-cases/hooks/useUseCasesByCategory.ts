import { useState, useEffect } from 'react';
import type { UseCase } from '@/components/dashboard/top-use-cases/common/types';
import { useCategoryCache } from './useCategoryCache';

interface UseCasesByCategoryData {
  useCases: UseCase[];
  isLoading: boolean;
  error: Error | null;
  totalUseCases: number;
  totalPages: number;
  currentPage: number;
}

interface UseCasesByCategoryOptions {
  initialPage?: number;
  useCache?: boolean;
}

// Cache for API responses
const responseCache = new Map<
  string,
  {
    data: UseCasesByCategoryData;
    timestamp: number;
  }
>();

// Cache timeout - 5 minutes
const CACHE_TIMEOUT = 5 * 60 * 1000;

export function useUseCasesByCategory(
  categoryId: string | null,
  options: UseCasesByCategoryOptions = { initialPage: 1, useCache: true },
) {
  const { getCachedPage, setCachedPage } = useCategoryCache();

  // Initialize state, using cache if available and enabled
  const getInitialPage = (): number => {
    if (!categoryId || !options.useCache) return options.initialPage || 1;
    return getCachedPage(categoryId, options.initialPage || 1);
  };

  const [data, setData] = useState<UseCasesByCategoryData>({
    useCases: [],
    isLoading: false,
    error: null,
    totalUseCases: 0,
    totalPages: 0,
    currentPage: getInitialPage(),
  });

  // Check response cache for data
  useEffect(() => {
    if (!categoryId || !options.useCache) return;

    const cacheKey = `${categoryId}-${getInitialPage()}`;
    const cachedResponse = responseCache.get(cacheKey);

    if (
      cachedResponse &&
      Date.now() - cachedResponse.timestamp < CACHE_TIMEOUT
    ) {
      // Use cached data immediately - no loading needed
      setData((prevData) => ({
        ...cachedResponse.data,
        isLoading: false,
        error: null,
      }));
    }
  }, [categoryId]);

  const fetchUseCases = async (page: number = data.currentPage) => {
    if (!categoryId) return;

    // Check if we have fresh cached data
    const cacheKey = `${categoryId}-${page}`;
    const cachedResponse = responseCache.get(cacheKey);

    if (
      options.useCache &&
      cachedResponse &&
      Date.now() - cachedResponse.timestamp < CACHE_TIMEOUT
    ) {
      // Use cached data immediately - no loading needed
      setData((prevData) => ({
        ...cachedResponse.data,
        isLoading: false,
        error: null,
      }));
      return;
    }

    // No cache or cache expired - fetch from API
    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/use-cases?categoryId=${categoryId}&page=${page}&limit=10`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch use cases: ${response.status}`);
      }

      const result = await response.json();
      const newData = {
        useCases: result.useCases,
        isLoading: false,
        error: null,
        totalUseCases: result.totalUseCases,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      };

      setData(newData);

      // Cache the API response
      if (options.useCache !== false) {
        responseCache.set(cacheKey, {
          data: newData,
          timestamp: Date.now(),
        });

        // Also update the page cache
        setCachedPage(categoryId, result.currentPage);
      }
    } catch (err) {
      console.error('Error fetching use cases by category:', err);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  };

  const handlePageChange = (page: number) => {
    fetchUseCases(page);
  };

  useEffect(() => {
    if (categoryId) {
      // If we have a category ID, fetch data starting from the cached page
      fetchUseCases(getInitialPage());
    }
  }, [categoryId]);

  return {
    ...data,
    refreshUseCases: fetchUseCases,
    handlePageChange,
    isCached:
      options.useCache &&
      !!responseCache.get(`${categoryId}-${data.currentPage}`),
  };
}
