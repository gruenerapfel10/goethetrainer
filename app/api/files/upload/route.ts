import { auth } from '@/app/(auth)/auth';
import { adminStorage } from '@/lib/firebase/admin';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    console.log('[api/files/upload] Received file upload request');
    
    const session = await auth();
    if (!session?.user?.email) {
      console.error('[api/files/upload] Unauthorized - no session');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[api/files/upload] No file in form data');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[api/files/upload] Uploading file: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `uploads/${session.user.email}/${timestamp}-${sanitizedName}`;

    console.log(`[api/files/upload] Uploading to Firebase Storage: ${storagePath}`);

    try {
      // Get the bucket from admin storage
      const bucket = adminStorage.bucket();
      const file_ref = bucket.file(storagePath);

      console.log(`[api/files/upload] Creating Firebase storage reference and uploading...`);
      
      // Upload file with metadata
      const metadata = {
        contentType: file.type || 'application/octet-stream',
        metadata: {
          uploadedBy: session.user.email,
          originalName: file.name,
        },
      };

      await file_ref.save(Buffer.from(uint8Array), { metadata });
      console.log(`[api/files/upload] Upload successful, generating signed URL...`);

      // Generate a signed URL that expires in 7 days
      const [signedUrl] = await file_ref.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log(`[api/files/upload] Signed URL obtained: ${signedUrl.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({
          url: signedUrl,
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          storagePath,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (storageError) {
      console.error('[api/files/upload] Firebase Storage error:', storageError);
      throw storageError;
    }
  } catch (error) {
    console.error('[api/files/upload] Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
