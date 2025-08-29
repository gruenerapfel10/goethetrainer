// app/api/logos/active/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getActiveLogo } from '../../../../../lib/db/queries';

export async function GET(req: NextRequest) {
  try {
    // Get the active logo
    const activeLogo = await getActiveLogo();

    if (!activeLogo) {
      return NextResponse.json(
        { url: '/mua-logo-128x128-blue.png' }, // Default logo
        { status: 200 },
      );
    }

    return NextResponse.json({ url: activeLogo.url }, { status: 200 });
  } catch (error) {
    console.error('Error getting active logo:', error);
    return NextResponse.json(
      { error: 'Failed to get active logo', url: '/mua-logo-128x128-blue.png' },
      { status: 500 },
    );
  }
}
