import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/clients';

type AuthSession =
  | {
      user: { id: string; email: string | null; isAdmin: boolean };
    }
  | null;

/**
 * Compatibility helper replacing NextAuth's `auth()` with Supabase Auth.
 * Returns minimal session shape used across the app.
 */
export async function auth(): Promise<AuthSession> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single();

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      isAdmin: profile?.is_admin ?? false,
    },
  };
}

export const signIn = async () => {
  throw new Error('signIn is no longer available; use Supabase auth client APIs.');
};
export const signOut = async () => {
  throw new Error('signOut is no longer available; use Supabase auth client APIs.');
};

export const GET = async () => new Response(null, { status: 404 });
export const POST = async () => new Response(null, { status: 404 });
