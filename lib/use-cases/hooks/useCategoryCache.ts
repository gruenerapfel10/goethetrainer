import { useState, useEffect } from 'react';

type CategoryCache = {
  [categoryId: string]: {
    page: number;
    timestamp: number;
  };
};

// Cache timeout - 30 minutes
const CACHE_EXPIRY = 30 * 60 * 1000;

/**
 * Hook for managing cached category state
 * Stores the last viewed page for each category
 */
export const useCategoryCache = () => {
  const [cache, setCache] = useState<CategoryCache>({});
  
  // Load cache from localStorage on mount and clean expired entries
  useEffect(() => {
    try {
      const storedCache = localStorage.getItem('categoryPageCache');
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        
        // Clean up expired entries
        const now = Date.now();
        const cleanedCache = Object.entries(parsedCache).reduce(
          (acc, [key, value]: [string, any]) => {
            if (now - value.timestamp < CACHE_EXPIRY) {
              acc[key] = value;
            }
            return acc;
          },
          {} as CategoryCache
        );
        
        setCache(cleanedCache);
        
        // Save the cleaned cache if items were removed
        if (Object.keys(cleanedCache).length !== Object.keys(parsedCache).length) {
          localStorage.setItem('categoryPageCache', JSON.stringify(cleanedCache));
        }
      }
    } catch (error) {
      console.error('Failed to load category cache from localStorage:', error);
      // If loading fails, reset cache
      setCache({});
    }
  }, []);
  
  // Save cache to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('categoryPageCache', JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to save category cache to localStorage:', error);
    }
  }, [cache]);
  
  /**
   * Get the cached page for a category
   * @param categoryId - The category ID to lookup
   * @param defaultPage - Default page to return if not in cache
   * @returns The cached page number or default
   */
  const getCachedPage = (categoryId: string, defaultPage = 1): number => {
    const cachedValue = cache[categoryId];
    
    // Check if we have a valid, non-expired cache entry
    if (cachedValue && (Date.now() - cachedValue.timestamp < CACHE_EXPIRY)) {
      return cachedValue.page;
    }
    
    // No valid cache, return default
    return defaultPage;
  };
  
  /**
   * Set the cached page for a category
   * @param categoryId - The category ID to cache
   * @param page - The page number to cache
   */
  const setCachedPage = (categoryId: string, page: number): void => {
    setCache(prev => ({
      ...prev,
      [categoryId]: {
        page,
        timestamp: Date.now()
      }
    }));
  };
  
  /**
   * Clear cached data for a specific category
   * @param categoryId - The category ID to clear
   */
  const clearCategoryCache = (categoryId: string): void => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[categoryId];
      return newCache;
    });
  };
  
  /**
   * Clear all cached data
   */
  const clearAllCache = (): void => {
    setCache({});
    localStorage.removeItem('categoryPageCache');
  };
  
  /**
   * Check if a cache entry is valid
   * @param categoryId - The category ID to check
   * @returns boolean indicating if there's a valid cache entry
   */
  const hasCachedPage = (categoryId: string): boolean => {
    const entry = cache[categoryId];
    return !!(entry && (Date.now() - entry.timestamp < CACHE_EXPIRY));
  };
  
  return {
    getCachedPage,
    setCachedPage,
    clearCategoryCache,
    clearAllCache,
    hasCachedPage
  };
}; 