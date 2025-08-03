// app/api/logos/remove/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '../../../../(auth)/auth';
import { removeLogo } from '../../../../../lib/db/queries';

const removeLogoSchema = z.object({
  url: z.string().min(1, 'Logo URL is required'),
});

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session?.user;
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    // Parse and validate URL parameter
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json(
        { error: 'Logo URL is required' },
        { status: 400 },
      );
    }

    const validatedData = removeLogoSchema.safeParse({ url });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors },
        { status: 400 },
      );
    }

    // Remove the logo
    await removeLogo({ logoUrl: validatedData.data.url });

    return NextResponse.json(
      { success: true, message: 'Logo removed successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error removing logo:', error);
    return NextResponse.json(
      { error: 'Failed to remove logo' },
      { status: 500 },
    );
  }
}
