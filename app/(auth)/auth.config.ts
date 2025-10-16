import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
    newUser: '/',
    error: '/login', // Add error page
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith('/');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnCallback = nextUrl.pathname.startsWith('/api/auth/callback');
      const isOnError = nextUrl.pathname.startsWith('/api/auth/error');

      // Allow auth callbacks and error pages
      if (isOnCallback || isOnError) {
        return true;
      }

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (isOnRegister || isOnLogin) {
        return true;
      }

      if (isOnChat) {
        if (isLoggedIn) return true;
        return false;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;