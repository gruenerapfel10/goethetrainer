import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { CategoryRepository } from '@/lib/flashcards/categories-repository';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const categories = await CategoryRepository.list(session.user.id);
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }
  try {
    const category = await CategoryRepository.create(session.user.id, name);
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 400 }
    );
  }
}
