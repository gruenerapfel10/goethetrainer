import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';
import { JobProvider, JobSearchQuery, Job, JOB_PROVIDERS } from '../job-providers';

export class LinkedInProvider implements JobProvider {
  name = JOB_PROVIDERS.LINKEDIN;
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
      // Build LinkedIn search URL
      const searchParams = new URLSearchParams();
      
      if (query.keywords) {
        searchParams.append('keywords', query.keywords);
      }
      
      if (query.location) {
        searchParams.append('location', query.location);
      }
      
      // Map job types to LinkedIn filters
      const jobTypeMap: Record<string, string> = {
        'full-time': 'F',
        'part-time': 'P',
        'contract': 'C',
        'internship': 'I'
      };
      
      if (query.jobType && jobTypeMap[query.jobType]) {
        searchParams.append('f_JT', jobTypeMap[query.jobType]);
      }
      
      // Map experience levels
      const experienceMap: Record<string, string> = {
        'entry': '1,2',
        'mid': '3,4',
        'senior': '5,6',
        'executive': '6'
      };
      
      if (query.experienceLevel && experienceMap[query.experienceLevel]) {
        searchParams.append('f_E', experienceMap[query.experienceLevel]);
      }
      
      if (query.remote) {
        searchParams.append('f_WT', '2'); // Remote filter
      }
      
      // Sort by date
      searchParams.append('sortBy', 'DD');
      
      const url = `https://www.linkedin.com/jobs/search/?${searchParams.toString()}`;
      
      // First scrape the page to get markdown content
      const scrapeResult = await this.firecrawl.scrapeUrl(url);
      
      if (!scrapeResult.success || !scrapeResult.markdown) {
        console.warn('Failed to scrape LinkedIn page');
        return [];
      }
      
      // Then use extract to get structured job data
      const extractResult = await this.firecrawl.extract([url], {
        prompt: `Extract all job listings from this LinkedIn job search page. For each job, extract:
        - title: job title
        - company: company name
        - location: job location
        - description: brief job description (first 200 chars if available)
        - posted_date: when the job was posted (e.g., "2 days ago", "1 week ago")
        - job_url: URL to the full job posting
        - salary: salary range if mentioned
        - job_type: full-time, part-time, contract, or internship
        - experience_level: entry, mid, senior, or executive level
        
        Return as an array of job objects.`
      });
      
      if (!extractResult.success || !extractResult.data) {
        console.warn('Failed to extract job data from LinkedIn');
        return [];
      }
      
      // Parse the extracted data
      let jobsData: any[] = [];
      if (extractResult.data.summary) {
        try {
          // The extract API returns data in summary field
          const parsed = JSON.parse(extractResult.data.summary);
          jobsData = Array.isArray(parsed) ? parsed : parsed.jobs || [];
        } catch (e) {
          console.warn('Failed to parse extracted job data:', e);
          // Try to extract jobs from markdown as fallback
          jobsData = this.parseJobsFromMarkdown(scrapeResult.markdown);
        }
      }
      
      // Transform scraped data to our Job format
      const jobs: Job[] = jobsData.map((job: any, index: number) => {
        // Parse salary if available
        let salary_min, salary_max;
        if (job.salary) {
          const salaryMatch = job.salary.match(/\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/);
          if (salaryMatch) {
            salary_min = parseInt(salaryMatch[1].replace(/,/g, ''));
            if (salaryMatch[2]) {
              salary_max = parseInt(salaryMatch[2].replace(/,/g, ''));
            }
          }
        }
        
        // Determine job type
        let jobType: Job['type'] = 'full-time';
        if (job.job_type?.toLowerCase().includes('part')) jobType = 'part-time';
        else if (job.job_type?.toLowerCase().includes('contract')) jobType = 'contract';
        else if (job.job_type?.toLowerCase().includes('intern')) jobType = 'internship';
        
        // Determine experience level
        let experienceLevel: Job['experience_level'] = 'mid';
        const expText = (job.experience_level || job.title || '').toLowerCase();
        if (expText.includes('entry') || expText.includes('junior')) experienceLevel = 'entry';
        else if (expText.includes('senior') || expText.includes('sr')) experienceLevel = 'senior';
        else if (expText.includes('executive') || expText.includes('director')) experienceLevel = 'executive';
        
        return {
          id: `linkedin-${Date.now()}-${index}`,
          title: job.title || 'Unknown Position',
          company: job.company || 'Unknown Company',
          location: job.location || 'Unknown Location',
          type: jobType,
          experience_level: experienceLevel,
          salary_min,
          salary_max,
          posted_date: job.posted_date || new Date().toISOString(),
          description: job.description,
          remote: job.location?.toLowerCase().includes('remote') || query.remote || false,
          url: job.job_url || url,
          source: 'LinkedIn'
        };
      });
      
      // Apply limit
      const limit = query.limit || 20;
      return jobs.slice(0, limit);
      
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error);
      throw new Error(`Failed to fetch LinkedIn jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private parseJobsFromMarkdown(markdown: string): any[] {
    // Fallback parser for markdown content
    const jobs: any[] = [];
    
    // Simple regex patterns to extract job info from markdown
    const jobBlocks = markdown.split(/\n(?=#{1,3}\s)/); // Split by headings
    
    for (const block of jobBlocks) {
      const titleMatch = block.match(/^#{1,3}\s+(.+)/);
      const companyMatch = block.match(/(?:Company|Employer|Organization)[:\s]+([^\n]+)/i);
      const locationMatch = block.match(/(?:Location|Where)[:\s]+([^\n]+)/i);
      const typeMatch = block.match(/(?:Type|Employment)[:\s]+([^\n]+)/i);
      
      if (titleMatch) {
        jobs.push({
          title: titleMatch[1].trim(),
          company: companyMatch ? companyMatch[1].trim() : 'Unknown Company',
          location: locationMatch ? locationMatch[1].trim() : 'Unknown Location',
          job_type: typeMatch ? typeMatch[1].trim() : 'full-time',
          posted_date: 'Recently',
          description: block.substring(0, 200)
        });
      }
    }
    
    return jobs;
  }
}