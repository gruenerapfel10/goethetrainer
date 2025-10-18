import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { systemPrompts } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

// Middleware to check admin status
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Check if user is admin
  const isAdmin = session.user.isAdmin;
  if (!isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return null; // No error
}

export async function GET() {
  // Check admin status
  const authError = await checkAdmin();
  if (authError) return authError;
  
  try {
    const rows = await db.select().from(systemPrompts);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch system prompts' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Check admin status
  const authError = await checkAdmin();
  if (authError) return authError;
  
  try {
    const { assistantId, promptText } = await request.json();
    
    if (!assistantId || !promptText) {
      return NextResponse.json(
        { error: 'assistantId and promptText are required' },
        { status: 400 }
      );
    }
    
    await db
      .insert(systemPrompts)
      .values({ 
        assistantId, 
        promptText,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: systemPrompts.assistantId,
        set: { promptText, updatedAt: new Date() },
      });
      
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 });
  }
}