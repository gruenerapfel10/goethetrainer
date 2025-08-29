// app/api/knowledge-base/ingestion-status/route.ts

import { NextResponse, type NextRequest } from 'next/server';
// import { checkBedrockIngestionStatus } from '@/lib/aws/knowledge-base-service'; // Adjust path

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  // These might also be needed if checkBedrockIngestionStatus requires them and they aren't hardcoded
  const knowledgeBaseId = searchParams.get('knowledgeBaseId') || process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
  const dataSourceId = searchParams.get('dataSourceId') || process.env.SHAREPOINT_KNOWLEDGE_BASE_DATA_SOURCE_ID;


  if (!jobId) {
    return NextResponse.json({ error: 'No Bedrock Ingestion Job ID provided.' }, { status: 400 });
  }
  if (!knowledgeBaseId || !dataSourceId) {
    return NextResponse.json({ error: 'KnowledgeBaseID or DataSourceID missing for status check.' }, { status: 400 });
  }


  try {
    // const jobDetails = await checkBedrockIngestionStatus(knowledgeBaseId, dataSourceId, jobId);

  //   if (!jobDetails) {
  //     return NextResponse.json({ error: 'Failed to get ingestion job details or job not found.' }, { status: 404 });
  //   }
  //
  //   // Transform to the structure your frontend expects, if different from Bedrock's direct response
  //   // The knowledge-base-file-list.tsx expects: { status, statistics, error }
  //   const response = {
  //     status: jobDetails.status,
  //     statistics: jobDetails.statistics ? {
  //       dataSourceDocumentsProcessedCount: jobDetails.statistics.numberOfDocumentsScanned, // Or another relevant stat
  //       dataSourceDocumentsTotalCount: jobDetails.statistics.numberOfDocumentsScanned, // Or another relevant stat
  //       // Map other Bedrock statistics as needed by your frontend
  //     } : undefined,
  //     error: jobDetails.failureReasons && jobDetails.failureReasons.length > 0 ? jobDetails.failureReasons.join('; ') : undefined,
  //   };
  //
  //   return NextResponse.json(response);
  } catch (error) {
    console.error('API Error: Failed to get Bedrock ingestion status:', error);
    return NextResponse.json(
      { error: `Failed to get ingestion status: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}