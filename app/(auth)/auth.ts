import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from './auth.config';
import { getUserByEmail, createUser } from '@/lib/firebase/firestore-queries';

const handler = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  providers: [
    Credentials({
      async authorize({ email, password }: any) {
        const user = await getUserByEmail(email);
        if (!user) return null;
        const passwordsMatch = await compare(password, user.password!);
        if (!passwordsMatch) return null;
        return {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin || false,
        };
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          response_type: "code",
          response_mode: "query"
        }
      },
      profile(profile) {
        return {
          id: profile.oid || profile.sub,
          name: profile.name,
          email: profile.preferred_username,
          image: null,
        };
      },
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'credentials') {
        return true;
      }

      if (account?.provider === 'microsoft-entra-id' && profile?.preferred_username) {
        try {
          const userEmail = profile.preferred_username;
          const existingUser = await getUserByEmail(userEmail);

          if (!existingUser) {
            await createUser({
              email: userEmail,
              isAdmin: false,
            });
            const newUser = await getUserByEmail(userEmail);

            if (!newUser) {
              console.error('[auth] Failed to create user for:', userEmail);
              return false;
            }

            user.id = newUser.id;
            user.email = userEmail;
            user.isAdmin = newUser.isAdmin || false;
          } else {
            user.id = existingUser.id;
            user.email = userEmail;
            user.isAdmin = existingUser.isAdmin || false;
          }
        } catch (error) {
          console.error('[auth] Error in signIn callback:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    }
  },
  events: {
    async signIn({ user, account }) {
      console.log('[auth] Successful sign in:', {
        provider: account?.provider,
        email: user.email
      });
    },
  }
});

export const { auth, signIn, signOut } = handler;
export const { GET, POST } = handler.handlers;
