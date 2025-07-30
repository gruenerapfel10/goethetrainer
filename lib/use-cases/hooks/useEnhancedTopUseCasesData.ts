import { useState, useEffect } from 'react';
import type { TopUseCaseCategory } from '@/components/dashboard/top-use-cases/common/types';
import { fetchCategoriesAPI } from '../services/api';
import type { FetchCategoriesParams } from '../services/api';

export interface CategoriesData {
  categories: TopUseCaseCategory[];
  isLoading: boolean;
  error: Error | null;
}

export function useEnhancedTopUseCasesData(): CategoriesData {
  const [categories, setCategories] = useState<TopUseCaseCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params: FetchCategoriesParams = { page: 1, limit: 100, query: '', filter: 'all' };
        const data = await fetchCategoriesAPI(params);
        setCategories(data.categories || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch categories');
        console.error("[useEnhancedTopUseCasesData] Failed to fetch categories:", error);
        setError(error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    isLoading,
    error
  };
} 