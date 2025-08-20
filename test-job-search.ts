// Test script for job search functionality
import { JobAggregator } from './lib/jobs/job-aggregator';

async function testJobSearch() {
  console.log('Testing Job Search Implementation...\n');
  
  const aggregator = new JobAggregator();
  
  try {
    console.log('Searching for software engineer jobs...');
    const result = await aggregator.searchJobs({
      keywords: 'software engineer',
      limit: 5
    });
    
    console.log(`\nFound ${result.jobs.length} jobs:`);
    result.jobs.forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Source: ${job.source}`);
    });
    
    if (result.errors.length > 0) {
      console.log('\nProvider errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.provider}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testJobSearch();
}