import { type NextRequest, NextResponse } from 'next/server';
import { uploadLogo } from '../../../../../lib/s3/chat-customization-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
      const result = await uploadLogo(buffer, file.name, file.type);
      return NextResponse.json(result);
    } catch (uploadError) {
      console.error('Error from uploadLogo:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload to S3' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in upload logo API:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
