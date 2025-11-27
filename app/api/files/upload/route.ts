import { auth } from '@/app/(auth)/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/clients';

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

    console.log(`[api/files/upload] Uploading to Supabase Storage: ${storagePath}`);

    const supabase = createSupabaseServiceClient();
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, Buffer.from(uint8Array), {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[api/files/upload] Supabase Storage error:', uploadError);
      throw uploadError;
    }

    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    const signedUrl = signed?.signedUrl;

    return new Response(
      JSON.stringify({
        url: signedUrl || null,
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
