import { useEffect, useState } from 'react';

/**
 * Hook to fetch total time saved per category
 * Returns a map where keys are category IDs and values are the total minutes saved
 */
export function useTotalTimeSavedPerCategory() {
  const [data, setData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/use-cases/total-time-saved');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch total time saved: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching total time saved per category:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Return hook data and refresh function
  return {
    data,
    isLoading,
    error,
    refreshData: fetchData
  };
} 