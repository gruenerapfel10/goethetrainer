import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';
import { JobProvider, JobSearchQuery, Job, JOB_PROVIDERS } from '../job-providers';

export class SearchProvider implements JobProvider {
  name = 'search';
  enabled = true;
  private firecrawl: FirecrawlApp;

  constructor() {
    this.firecrawl = new FirecrawlApp(
      process.env.FIRECRAWL_URL ?? '',
      process.env.FIRECRAWL_API_KEY
    );
  }

  async searchJobs(query: JobSearchQuery): Promise<Job[]> {
    try {
      // Build search query
      const searchTerms: string[] = [];
      
      if (query.keywords) {
        searchTerms.push(query.keywords);
      }
      
      // Add job-specific search terms
      searchTerms.push('jobs', 'careers', 'hiring', 'openings');
      
      if (query.location && query.location !== 'remote') {
        searchTerms.push(query.location);
      }
      
      if (query.remote) {
        searchTerms.push('remote');
      }
      
      if (query.jobType) {
        searchTerms.push(query.jobType);
      }
      
      if (query.experienceLevel) {
        const levelMap: Record<string, string> = {
          'entry': 'entry level junior',
          'mid': 'mid level intermediate',
          'senior': 'senior lead',
          'executive': 'executive director vp'
        };
        searchTerms.push(levelMap[query.experienceLevel] || query.experienceLevel);
      }
      
      const searchQuery = searchTerms.join(' ');
      const limit = query.limit || 20;
      
      // Use Firecrawl search to find job-related pages
      const searchResult = await this.firecrawl.search(searchQuery, { limit: limit * 2 }); // Get more to filter
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        console.warn('No search results found');
        return [];
      }
      
      // Extract job URLs from search results
      const jobUrls = searchResult.data
        .filter((doc: any) => {
          const url = doc.url?.toLowerCase() || '';
          const title = doc.title?.toLowerCase() || '';
          const description = doc.description?.toLowerCase() || '';
          
          // Filter for job-related URLs
          return (
            url.includes('job') ||
            url.includes('career') ||
            url.includes('position') ||
            url.includes('opening') ||
            title.includes('job') ||
            title.includes('hiring') ||
            title.includes('position') ||
            description.includes('job') ||
            description.includes('hiring')
          );
        })
        .slice(0, Math.min(10, limit)) // Limit URLs to extract from
        .map((doc: any) => doc.url);
      
      if (jobUrls.length === 0) {
        console.warn('No job-related URLs found in search results');
        return [];
      }
      
      // Extract structured job data from the URLs
      const extractResult = await this.firecrawl.extract(jobUrls, {
        prompt: `Extract job listings from these pages. For each job found, extract:
        - title: job title
        - company: company name
        - location: job location
        - description: job description (max 500 chars)
        - posted_date: when posted
        - salary: salary if mentioned
        - job_type: full-time, part-time, contract, or internship
        - experience_level: entry, mid, senior, or executive
        - requirements: key requirements as an array
        - url: link to apply or learn more
        
        Return as an array of job objects. If a page has multiple jobs, extract all of them.`
      });
      
      if (!extractResult.success || !extractResult.data) {
        console.warn('Failed to extract job data');
        return [];
      }
      
      // Parse extracted data
      let jobsData: any[] = [];
      if (extractResult.data.summary) {
        try {
          const parsed = JSON.parse(extractResult.data.summary);
          jobsData = Array.isArray(parsed) ? parsed : parsed.jobs || [];
        } catch (e) {
          console.warn('Failed to parse extracted job data:', e);
          // Fallback: try to parse as plain text
          jobsData = this.parseJobsFromText(extractResult.data.summary);
        }
      }
      
      // Transform to our Job format
      const jobs: Job[] = jobsData.map((job: any, index: number) => {
        // Parse salary
        let salary_min, salary_max;
        if (job.salary) {
          const salaryMatch = job.salary.match(/\$?([\d,]+)(?:k)?(?:\s*-\s*\$?([\d,]+)(?:k)?)?/i);
          if (salaryMatch) {
            salary_min = parseInt(salaryMatch[1].replace(/,/g, ''));
            if (salaryMatch[1].includes('k') || job.salary.includes('k')) {
              salary_min *= 1000;
            }
            if (salaryMatch[2]) {
              salary_max = parseInt(salaryMatch[2].replace(/,/g, ''));
              if (salaryMatch[2].includes('k') || job.salary.includes('k')) {
                salary_max *= 1000;
              }
            }
          }
        }
        
        // Determine job type
        let jobType: Job['type'] = 'full-time';
        const typeText = (job.job_type || job.title || '').toLowerCase();
        if (typeText.includes('part')) jobType = 'part-time';
        else if (typeText.includes('contract')) jobType = 'contract';
        else if (typeText.includes('intern')) jobType = 'internship';
        
        // Determine experience level
        let experienceLevel: Job['experience_level'] = 'mid';
        const levelText = (job.experience_level || job.title || job.description || '').toLowerCase();
        if (levelText.includes('entry') || levelText.includes('junior')) experienceLevel = 'entry';
        else if (levelText.includes('senior') || levelText.includes('lead')) experienceLevel = 'senior';
        else if (levelText.includes('executive') || levelText.includes('director')) experienceLevel = 'executive';
        
        return {
          id: `search-${Date.now()}-${index}`,
          title: job.title || 'Unknown Position',
          company: job.company || 'Unknown Company',
          location: job.location || 'Unknown Location',
          type: jobType,
          experience_level: experienceLevel,
          salary_min,
          salary_max,
          posted_date: job.posted_date || new Date().toISOString(),
          description: job.description,
          requirements: Array.isArray(job.requirements) ? job.requirements : [],
          remote: job.location?.toLowerCase().includes('remote') || false,
          url: job.url || jobUrls[0],
          source: 'Web Search'
        };
      });
      
      return jobs.slice(0, limit);
      
    } catch (error) {
      console.error('Error in search provider:', error);
      // Return empty array to allow other providers to continue
      return [];
    }
  }
  
  private parseJobsFromText(text: string): any[] {
    // Basic text parser as fallback
    const jobs: any[] = [];
    const lines = text.split('\n');
    
    let currentJob: any = {};
    for (const line of lines) {
      if (line.includes('title:') || line.includes('Title:')) {
        if (currentJob.title) {
          jobs.push(currentJob);
          currentJob = {};
        }
        currentJob.title = line.split(':')[1]?.trim();
      } else if (line.includes('company:') || line.includes('Company:')) {
        currentJob.company = line.split(':')[1]?.trim();
      } else if (line.includes('location:') || line.includes('Location:')) {
        currentJob.location = line.split(':')[1]?.trim();
      }
    }
    
    if (currentJob.title) {
      jobs.push(currentJob);
    }
    
    return jobs;
  }
}