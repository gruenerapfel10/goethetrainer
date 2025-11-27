import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_FILES = [
  '/favicon.ico',
  '/favicon.png',
  '/logo.png',
  '/logo.svg',
  '/logo_white.png',
  '/fonts/geist-mono.woff2',
  '/fonts/geist.woff2',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/home') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const isChatRoute =
    pathname === '/chat' ||
    pathname.startsWith('/chat/');

  if (isChatRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow static files
  if (PUBLIC_FILES.some(file => pathname.includes(file))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/current-logo') || pathname.startsWith('/api/logos')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id*',
    '/api/:path*',
    '/login',
    '/register',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
