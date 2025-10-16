import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_FILES = [
  '/favicon.ico',
  '/moterra-logo.svg',
  '/moterra-logo-s.svg',
  '/logo.svg',
  '/logo_white.png',
  '/fonts/geist-mono.woff2',
  '/fonts/geist.woff2',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;


  // Allow static files
  if (PUBLIC_FILES.some(file => pathname.includes(file))) {
    return NextResponse.next();
  }

  // Always allow NextAuth API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith('/api/current-logo') || pathname.startsWith('/api/logos')) {
    return NextResponse.next();
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });

  // Check if this is a chat page request
  const isChatPage = pathname.startsWith('/chat/');
  
  // For chat pages, we need to check if it's public before requiring auth
  if (isChatPage && !token) {
    // Allow the request to proceed to the page where it will check visibility
    // The page itself will handle authentication for private chats
    return NextResponse.next();
  }

  // If no token, redirect to login (except for auth pages and public chats)
  if (!token) {
    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and trying to access auth pages, redirect to home
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect API routes (except auth and public ones)
  if (pathname.startsWith('/api/')) {
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