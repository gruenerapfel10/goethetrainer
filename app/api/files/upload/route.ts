import { auth } from '@/app/(auth)/auth';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          uploadedBy: session.user.email,
          originalName: file.name,
        },
      };

      console.log(`[api/files/upload] Creating Firebase storage reference and uploading...`);
      const uploadResult = await uploadBytes(storageRef, uint8Array, metadata);
      console.log(`[api/files/upload] Upload successful, getting download URL...`);

      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log(`[api/files/upload] Download URL obtained: ${downloadURL.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({
          url: downloadURL,
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
