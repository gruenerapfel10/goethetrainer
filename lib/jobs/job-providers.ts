export interface JobProvider {
  name: string;
  searchJobs: (query: JobSearchQuery) => Promise<Job[]>;
  enabled: boolean;
}

export interface JobSearchQuery {
  keywords?: string;
  location?: string;
  remote?: boolean;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  limit?: number;
  offset?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  salary_min?: number;
  salary_max?: number;
  posted_date: string;
  description?: string;
  requirements?: string[];
  remote?: boolean;
  department?: string;
  url: string;
  source: string;
}

// Provider registry
export const JOB_PROVIDERS = {
  LINKEDIN: 'linkedin',
  INDEED: 'indeed',
  GLASSDOOR: 'glassdoor',
  ARBEITNOW: 'arbeitnow',
  THEIRSTACK: 'theirstack',
} as const;

export type JobProviderType = typeof JOB_PROVIDERS[keyof typeof JOB_PROVIDERS];