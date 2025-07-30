// app/api/knowledge-base/files/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { filesMetadata, type FileMetadata as DbFileMetadata, } from '@/lib/db/schema'; // Adjust path
import { asc, desc, ilike, count, type SQL, or, } from 'drizzle-orm';
import {db} from "@/lib/db/client";

// Interface for FileInfo matching your frontend (file-table.tsx)
interface FileInfo {
  key: string; // s3_key will be used here
  documentId: string; // s3_key or a Bedrock-specific ID if available and preferred
  size: number;
  lastModified: string; // ISO string format
  sharePointUrl?: string | null;
  status?: string; // Corresponds to ingestionStatusEnum values
  isIngested?: boolean;
  fileName?: string;
}

interface ApiRequestParams {
  page: number;
  limit: number;
  sortField: keyof DbFileMetadata | 'key' | 'documentId' | 'size' | 'lastModified' | 'status' | 'isIngested'; // Allow frontend sort fields + DB fields
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  // forceRefresh?: boolean; // Less relevant now as we query DB directly
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

// Helper to map database model (DbFileMetadata) to frontend FileInfo
function mapDbToFileInfo(dbFile: DbFileMetadata): FileInfo {
  return {
    key: dbFile.s3Key,
    // For documentId, frontend uses it for deletion.
    // Using s3Key here is consistent if deletion targets S3 object first.
    // If you store a specific Bedrock document ID per S3 file, you could use that:
    // documentId: dbFile.bedrockIngestedS3ObjectId || dbFile.s3Key,
    documentId: dbFile.s3Key,
    size: dbFile.sizeBytes ?? 0,
    // Prefer s3LastModifiedAt for 'lastModified' as it reflects the data Bedrock uses.
    // Fallback to updatedAt if s3LastModifiedAt is null.
    lastModified: (dbFile.s3LastModifiedAt || dbFile.updatedAt)?.toISOString() || '',
    sharePointUrl: dbFile.sharepointWebUrl,
    status: dbFile.ingestionStatus ?? 'UNKNOWN', // Default to UNKNOWN if somehow null
    isIngested: dbFile.ingestionStatus === 'INDEXED',
    fileName: dbFile.fileName
  };
}

export const dynamic = 'force-dynamic'; // Ensures the route is re-evaluated on each request

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: ApiRequestParams = {
    page: Number.parseInt(searchParams.get('page') || '1', 10),
    limit: Number.parseInt(searchParams.get('limit') || '15', 10),
    // Default sortField to 'updatedAt' from DbFileMetadata for broader compatibility initially
    sortField: (searchParams.get('sortField') as ApiRequestParams['sortField']) || 'updatedAt',
    sortDirection: (searchParams.get('sortDirection') as ApiRequestParams['sortDirection']) || 'desc',
    searchQuery: searchParams.get('searchQuery') || '',
  };

  // Sanitize page and limit
  params.page = Math.max(1, params.page);
  params.limit = Math.min(Math.max(params.limit, 5), 100); // Min 5, Max 100 items per page

  try {
    // --- Determine Sort Column and Direction ---
    let orderByClause: SQL | SQL[] | undefined;
    const drizzleDirection = params.sortDirection === 'asc' ? asc : desc;

    // Map frontend sort fields to database columns more explicitly
    switch (params.sortField) {
      case 'key': // maps to s3Key
        orderByClause = drizzleDirection(filesMetadata.s3Key);
        break;
      case 'documentId': // also maps to s3Key in our current setup
        orderByClause = drizzleDirection(filesMetadata.s3Key);
        break;
      case 'size':
        orderByClause = drizzleDirection(filesMetadata.sizeBytes);
        break;
      case 'lastModified':
        // Prefer s3LastModifiedAt, fallback to updatedAt if it's more relevant for "activity"
        orderByClause = drizzleDirection(filesMetadata.s3LastModifiedAt);
        break;
      case 'status':
        orderByClause = drizzleDirection(filesMetadata.ingestionStatus);
        break;
      // Direct mapping for DbFileMetadata fields if passed from frontend
      case 's3Key': orderByClause = drizzleDirection(filesMetadata.s3Key); break;
      case 'fileName': orderByClause = drizzleDirection(filesMetadata.fileName); break;
      case 's3LastModifiedAt': orderByClause = drizzleDirection(filesMetadata.s3LastModifiedAt); break;
      case 'sharepointLastModifiedAt': orderByClause = drizzleDirection(filesMetadata.sharepointLastModifiedAt); break;
      case 'createdAt': orderByClause = drizzleDirection(filesMetadata.createdAt); break;
      case 'updatedAt': orderByClause = drizzleDirection(filesMetadata.updatedAt); break;
      default:
        // Fallback to a sensible default if sortField is unrecognized
        console.warn(`Unrecognized sortField: ${params.sortField}. Defaulting to updatedAt desc.`);
        orderByClause = desc(filesMetadata.updatedAt);
    }

    // --- Build WHERE Clause for Search ---
    let whereClause: SQL | undefined = undefined;
    if (params.searchQuery) {
      const query = `%${params.searchQuery}%`;
      // Search in fileName, s3Key. Add more fields if needed.
      whereClause = or(
        ilike(filesMetadata.fileName, query),
        ilike(filesMetadata.s3Key, query)
        // Example: you could also search in sharepointWebUrl if relevant
        // ilike(filesMetadata.sharepointWebUrl, query)
      );
    }

    // --- Fetch Paginated Files ---
    const dbFilesQuery = db
    .select()
    .from(filesMetadata)
    .where(whereClause) // Apply search filter
    .orderBy(orderByClause) // Apply sorting
    .limit(params.limit)
    .offset((params.page - 1) * params.limit);

    // --- Fetch Total Count with the same filter ---
    const totalCountQuery = db
    .select({ value: count() })
    .from(filesMetadata)
    .where(whereClause); // Apply the same search filter for accurate total count

    // Execute queries
    const [dbFilesResult, totalCountResult] = await Promise.all([
      dbFilesQuery.execute(), // For Drizzle, .execute() might not be needed if it's directly awaitable
      totalCountQuery.execute(),
    ]);

    const files: FileInfo[] = dbFilesResult.map(mapDbToFileInfo);
    const totalCountValue = totalCountResult[0]?.value ?? 0;
    const totalPages = Math.ceil(totalCountValue / params.limit) || 1;

    const responseData = {
      files,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalPages,
        totalCount: totalCountValue,
      },
    };

    console.log(`API Files: Returning page ${params.page}/${totalPages} (${files.length} files of ${totalCountValue} total) for query: '${params.searchQuery}'`);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('API Error: Failed to fetch knowledge base files:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch files from the knowledge base.',
        message: error.message, // Include error message for debugging (consider removing in prod)
        files: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          totalPages: 0,
          totalCount: 0,
        },
      },
      { status: 500 }
    );
  }
}