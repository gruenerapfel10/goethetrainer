import { NextRequest, NextResponse } from 'next/server';
import { JobAggregator } from '@/lib/jobs/job-aggregator';
import { JobSearchQuery } from '@/lib/jobs/job-providers';

export const maxDuration = 30; // 30 seconds timeout for job fetching

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Build search query from params
    const query: JobSearchQuery = {
      keywords: searchParams.get('keywords') || undefined,
      location: searchParams.get('location') || undefined,
      remote: searchParams.get('remote') === 'true',
      experienceLevel: searchParams.get('experienceLevel') as JobSearchQuery['experienceLevel'] || undefined,
      jobType: searchParams.get('jobType') as JobSearchQuery['jobType'] || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };
    
    // Validate limit
    if (query.limit && query.limit > 100) {
      query.limit = 100; // Cap at 100 to prevent abuse
    }
    
    // Create aggregator and fetch jobs
    const aggregator = new JobAggregator();
    const { jobs, errors } = await aggregator.searchJobs(query);
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedJobs = jobs.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        total: jobs.length,
        offset,
        limit,
        providers: aggregator.getEnabledProviders(),
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('Error in job search API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Build search query from body
    const query: JobSearchQuery = {
      keywords: body.keywords,
      location: body.location,
      remote: body.remote,
      experienceLevel: body.experienceLevel,
      jobType: body.jobType,
      limit: body.limit || 20,
      offset: body.offset || 0,
    };
    
    // Validate limit
    if (query.limit && query.limit > 100) {
      query.limit = 100;
    }
    
    // Create aggregator and fetch jobs
    const aggregator = new JobAggregator();
    
    // Handle provider settings if provided
    if (body.providers) {
      for (const [provider, enabled] of Object.entries(body.providers)) {
        aggregator.setProviderEnabled(provider, enabled as boolean);
      }
    }
    
    const { jobs, errors } = await aggregator.searchJobs(query);
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedJobs = jobs.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        total: jobs.length,
        offset,
        limit,
        providers: aggregator.getEnabledProviders(),
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('Error in job search API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}