import { Job, JobSearchQuery, JobProvider } from './job-providers';
import { LinkedInProvider } from './providers/linkedin-provider';
import { ArbeitnowProvider } from './providers/arbeitnow-provider';
import { SearchProvider } from './providers/search-provider';

export class JobAggregator {
  private providers: JobProvider[] = [];
  
  constructor() {
    // Initialize providers
    this.providers = [
      new SearchProvider(), // General web search for jobs
      new LinkedInProvider(), // LinkedIn specific scraping
      new ArbeitnowProvider(), // Free European jobs API
    ];
  }
  
  async searchJobs(query: JobSearchQuery): Promise<{
    jobs: Job[];
    errors: { provider: string; error: string }[];
  }> {
    const allJobs: Job[] = [];
    const errors: { provider: string; error: string }[] = [];
    
    // Fetch from all enabled providers in parallel
    const promises = this.providers
      .filter(provider => provider.enabled)
      .map(async (provider) => {
        try {
          const jobs = await provider.searchJobs(query);
          return { provider: provider.name, jobs, error: null };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error fetching from ${provider.name}:`, errorMessage);
          return { 
            provider: provider.name, 
            jobs: [], 
            error: errorMessage 
          };
        }
      });
    
    const results = await Promise.all(promises);
    
    // Aggregate results
    for (const result of results) {
      if (result.error) {
        errors.push({ provider: result.provider, error: result.error });
      }
      allJobs.push(...result.jobs);
    }
    
    // Sort by posted date (newest first)
    allJobs.sort((a, b) => {
      const dateA = new Date(a.posted_date).getTime();
      const dateB = new Date(b.posted_date).getTime();
      return dateB - dateA;
    });
    
    // Remove duplicates based on title + company
    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    return {
      jobs: uniqueJobs,
      errors
    };
  }
  
  private deduplicateJobs(jobs: Job[]): Job[] {
    const seen = new Set<string>();
    const uniqueJobs: Job[] = [];
    
    for (const job of jobs) {
      // Create a unique key based on title and company
      const key = `${job.title.toLowerCase().trim()}-${job.company.toLowerCase().trim()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueJobs.push(job);
      }
    }
    
    return uniqueJobs;
  }
  
  // Get enabled providers
  getEnabledProviders(): string[] {
    return this.providers
      .filter(p => p.enabled)
      .map(p => p.name);
  }
  
  // Enable/disable specific providers
  setProviderEnabled(providerName: string, enabled: boolean): void {
    const provider = this.providers.find(p => p.name === providerName);
    if (provider) {
      provider.enabled = enabled;
    }
  }
}