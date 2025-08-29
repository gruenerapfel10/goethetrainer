import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_FILES = [
  '/favicon.ico',
  '/mua-logo-128x128-blue.png',
  '/mua-logo-128x128-white.png',
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

  // Always allow Firebase auth API routes
  if (pathname.startsWith('/api/auth')) {
    console.log('✅ Auth API allowed');
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/current-logo') || pathname.startsWith('/api/logos')) {
    console.log('✅ Public API allowed');
    return NextResponse.next();
  }

  // Get the auth token from cookies
  const token = request.cookies.get('auth-token');

  console.log('🔐 Has token:', !!token);

  // If no token, redirect to landing page (except for auth pages and landing)
  if (!token) {
    if (pathname === '/' || pathname === '/login' || pathname === '/register') {
      console.log('✅ Public page allowed');
      return NextResponse.next();
    }

    console.log('❌ No token, redirecting to landing page');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If logged in and trying to access auth pages or landing, redirect to universities
  if (token && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    console.log('✅ Redirecting logged-in user to universities');
    return NextResponse.redirect(new URL('/universities', request.url));
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
    '/universities/:id*',
    '/dashboard/:id*',
    '/profile/:path*',
    '/applications/:path*',
    '/documents/:path*',
    '/admin/:path*',
    '/counselor/:path*',
    '/parent/:path*',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};