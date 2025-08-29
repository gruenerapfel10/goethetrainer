import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { documents } from '@/lib/db/schema-applications';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!dbUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser[0].id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, Word, Text, or Image files.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${userId}/${documentType}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public',
    });

    // Save document metadata to database
    const newDocument = await db.insert(documents).values({
      userId,
      documentType: documentType as any,
      fileName: file.name,
      fileUrl: blob.url,
      fileSize: file.size,
      mimeType: file.type,
      title: title || file.name,
      description,
      version: 1,
      isVerified: false
    }).returning();

    return NextResponse.json({
      success: true,
      document: newDocument[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get user from database
    const dbUser = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (!dbUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser[0].id;

    // Get document
    const document = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify ownership
    if (document[0].userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete from Vercel Blob
    try {
      await del(document[0].fileUrl);
    } catch (error) {
      console.error('Failed to delete from blob storage:', error);
    }

    // Delete from database
    await db.delete(documents).where(eq(documents.id, documentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}