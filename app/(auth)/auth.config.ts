import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
    newUser: '/dashboard',
    error: '/login', // Add error page
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isOnRegister = pathname.startsWith('/register');
      const isOnLogin = pathname.startsWith('/login');
      const isOnHome = pathname.startsWith('/home');
      const isOnCallback = pathname.startsWith('/api/auth/callback');
      const isOnError = pathname.startsWith('/api/auth/error');
      const isAuthRoute = isOnLogin || isOnRegister;
      const isPublicRoute = isOnHome || isAuthRoute;

      // Allow auth callbacks and error pages
      if (isOnCallback || isOnError) {
        return true;
      }

      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      if (isPublicRoute) {
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
