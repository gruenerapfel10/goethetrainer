import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
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
