import { JobProvider, JobSearchQuery, Job, JOB_PROVIDERS } from '../job-providers';

export class ArbeitnowProvider implements JobProvider {
  name = JOB_PROVIDERS.ARBEITNOW;
  enabled = true;
  private baseUrl = 'https://www.arbeitnow.com/api/job-board-api';

  async searchJobs(query: JobSearchQuery): Promise<Job[]> {
    try {
      // Arbeitnow is primarily for European jobs
      // It's a free API that doesn't require authentication
      const response = await fetch(this.baseUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }
      
      // Filter and transform jobs
      let jobs = data.data
        .filter((job: any) => {
          // Apply filters
          if (query.keywords) {
            const keywords = query.keywords.toLowerCase();
            const matchesKeywords = 
              job.title?.toLowerCase().includes(keywords) ||
              job.description?.toLowerCase().includes(keywords) ||
              job.company_name?.toLowerCase().includes(keywords);
            if (!matchesKeywords) return false;
          }
          
          if (query.location) {
            const location = query.location.toLowerCase();
            const matchesLocation = 
              job.location?.toLowerCase().includes(location) ||
              job.city?.toLowerCase().includes(location) ||
              job.country?.toLowerCase().includes(location);
            if (!matchesLocation) return false;
          }
          
          if (query.remote !== undefined) {
            if (query.remote && !job.remote) return false;
            if (!query.remote && job.remote) return false;
          }
          
          return true;
        })
        .map((job: any): Job => {
          // Determine job type
          let jobType: Job['type'] = 'full-time';
          const tags = job.tags || [];
          if (tags.includes('part-time') || job.title?.toLowerCase().includes('part-time')) {
            jobType = 'part-time';
          } else if (tags.includes('contract') || job.title?.toLowerCase().includes('contract')) {
            jobType = 'contract';
          } else if (tags.includes('internship') || job.title?.toLowerCase().includes('intern')) {
            jobType = 'internship';
          }
          
          // Determine experience level from title and description
          let experienceLevel: Job['experience_level'] = 'mid';
          const text = `${job.title} ${job.description}`.toLowerCase();
          if (text.includes('entry') || text.includes('junior') || text.includes('graduate')) {
            experienceLevel = 'entry';
          } else if (text.includes('senior') || text.includes('lead') || text.includes('sr.')) {
            experienceLevel = 'senior';
          } else if (text.includes('executive') || text.includes('director') || text.includes('vp')) {
            experienceLevel = 'executive';
          }
          
          // Parse salary if available
          let salary_min, salary_max;
          if (job.salary_min) salary_min = parseInt(job.salary_min);
          if (job.salary_max) salary_max = parseInt(job.salary_max);
          
          return {
            id: `arbeitnow-${job.slug || Date.now()}`,
            title: job.title || 'Unknown Position',
            company: job.company_name || 'Unknown Company',
            location: job.location || job.city || 'Unknown Location',
            type: jobType,
            experience_level: experienceLevel,
            salary_min,
            salary_max,
            posted_date: job.created_at || new Date().toISOString(),
            description: job.description,
            requirements: job.tags || [],
            remote: job.remote || false,
            url: job.url || `https://www.arbeitnow.com/view/${job.slug}`,
            source: 'Arbeitnow'
          };
        });
      
      // Apply limit
      const limit = query.limit || 20;
      return jobs.slice(0, limit);
      
    } catch (error) {
      console.error('Error fetching Arbeitnow jobs:', error);
      // Return empty array instead of throwing to allow other providers to continue
      return [];
    }
  }
}