import { type NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const url = searchParams.get('url');

  if (!key && !url) {
    return NextResponse.json(
      { error: 'Missing logo key or URL' },
      { status: 400 }
    );
  }

  try {
    // Vercel Blob requires the full URL to delete
    if (url) {
      await del(url);
    } else {
      // If only key is provided, we can't delete without the full URL
      // In production, you'd store the full URL in your database
      return NextResponse.json(
        { error: 'Please provide the full blob URL for deletion' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logo Delete Error:', error);
    return NextResponse.json(
      { error: 'Logo deletion failed', details: error.message },
      { status: 500 }
    );
  }
}