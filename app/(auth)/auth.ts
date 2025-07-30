// auth.ts
import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { getUser, createUser } from '@/lib/db/queries';
import { authConfig } from './auth.config';

const handler = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return {
          id: users[0].id,
          email: users[0].email,
          isAdmin: users[0].isAdmin || false,
        };
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email User.Read offline_access"
        }
      },
      profile(profile) {
        return {
          id: profile.oid, // Using oid as it's unique per user in Azure AD
          name: profile.name,
          email: profile.preferred_username,
          image: null,
        };
      },
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle credentials login
      if (account?.provider === 'credentials') {
        return true;
      }

      // Handle Microsoft login
      if (account?.provider === 'microsoft-entra-id' && profile?.preferred_username) {
        const userEmail = profile.preferred_username;

        const [existingUser] = await getUser(userEmail);

        if (!existingUser) {
          await createUser(userEmail, '');
          const [newUser] = await getUser(userEmail);

          if (!newUser) {
            console.error('[auth] Failed to create user');
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
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
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
  }
});

export const { auth, signIn, signOut } = handler;
export const { GET, POST } = handler.handlers;