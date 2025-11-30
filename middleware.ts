import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback');

  const isChatRoute =
    pathname === '/chat' ||
    pathname.startsWith('/chat/');

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthCallback = pathname.startsWith('/auth/');

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

  if (isPublicPath || isApiRoute || isAuthCallback) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options?: any) {
          response.cookies.delete({ name, ...options });
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  } catch (error) {
    console.warn('Auth middleware fallback', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
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
