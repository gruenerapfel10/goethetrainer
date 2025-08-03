// types/next-auth.d.ts
// Firebase compatibility types
export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    isAdmin?: boolean;
  };
  expires: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  isAdmin?: boolean;
}

// Keep NextAuth module declarations for compatibility
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & import("next-auth").DefaultSession["user"]
  }

  interface User extends import("next-auth").DefaultUser {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
  }
}