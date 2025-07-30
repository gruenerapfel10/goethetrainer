// app/api/logos/set-active/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '../../../../(auth)/auth';
import { setActiveLogo } from '../../../../../lib/db/queries';

const setActiveLogoSchema = z.object({
  url: z.string().min(1, 'Logo URL is required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (assuming you have this in your session)
    const isAdmin = session.user.isAdmin;
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = setActiveLogoSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors },
        { status: 400 },
      );
    }

    await setActiveLogo({ logoUrl: validatedData.data.url });

    return NextResponse.json(
      { success: true, message: 'Logo set as active successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error setting active logo:', error);
    return NextResponse.json(
      { error: 'Failed to set active logo' },
      { status: 500 },
    );
  }
}
