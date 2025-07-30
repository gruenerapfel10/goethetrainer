import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_FILES = [
  '/favicon.ico',
  '/moterra-logo.svg',
  '/logo.svg',
  '/logo_white.png',
  '/fonts/geist-mono.woff2',
  '/fonts/geist.woff2',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔄 Middleware check for:', pathname);

  // Allow static files
  if (PUBLIC_FILES.some(file => pathname.includes(file))) {
    console.log('✅ Static file allowed');
    return NextResponse.next();
  }

  // Always allow NextAuth API routes
  if (pathname.startsWith('/api/auth')) {
    console.log('✅ Auth API allowed');
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/current-logo') || pathname.startsWith('/api/logos')) {
    console.log('✅ Public API allowed');
    return NextResponse.next();
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });

  console.log('🔐 Has token:', !!token);
  console.log('🔐 User email:', token?.email);

  // If no token, redirect to login (except for auth pages)
  if (!token) {
    if (pathname === '/login' || pathname === '/register') {
      console.log('✅ Auth page allowed');
      return NextResponse.next();
    }

    console.log('❌ No token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and trying to access auth pages, redirect to home
  if (token && (pathname === '/login' || pathname === '/register')) {
    console.log('✅ Redirecting logged-in user to home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect API routes (except auth and public ones)
  if (pathname.startsWith('/api/')) {
    console.log('✅ Protected API access granted');
    return NextResponse.next();
  }

  console.log('✅ Access granted');
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