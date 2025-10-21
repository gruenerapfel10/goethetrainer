import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createSession } from '@/lib/sessions/session-service';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, metadata } = await request.json();
    
    if (!type || !Object.values(SessionTypeEnum).includes(type)) {
      return NextResponse.json({ 
        error: 'Valid session type is required',
        validTypes: Object.values(SessionTypeEnum)
      }, { status: 400 });
    }

    const newSession = await createSession(
      session.user.email,
      type as SessionTypeEnum,
      metadata
    );

    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}
