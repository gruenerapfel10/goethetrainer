import { NextResponse } from 'next/server';
import { updateUserAdmin, deleteUserById } from '@/lib/db/queries';
import { auth } from "@/app/(auth)/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { isAdmin } = await request.json();
    const resolvedParams = await params;
    await updateUserAdmin({ userId: resolvedParams.userId, isAdmin });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    await deleteUserById(resolvedParams.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}