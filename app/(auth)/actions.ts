'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/clients';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password,
    });

    if (error) {
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'user_exists_google'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const normalizedEmail = validatedData.email.toLowerCase().trim();

    const service = createSupabaseServiceClient();

    try {
      const { data: userList } = await service.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        email: normalizedEmail,
      } as any);
      const existingUser = userList?.users?.find(
        user => user.email?.toLowerCase() === normalizedEmail
      );
      const hasGoogleIdentity = existingUser?.identities?.some(
        identity => identity.provider?.toLowerCase() === 'google'
      );
      if (hasGoogleIdentity) {
        return { status: 'user_exists_google' };
      }
    } catch (lookupError) {
      console.warn('[auth] user lookup failed, continuing with registration', lookupError);
    }

    // Use service role to create the user and confirm immediately.
    const { data, error } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password: validatedData.password,
      email_confirm: true,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('already registered') || msg.includes('duplicate')) {
        return { status: 'user_exists' };
      }
      console.error('[auth] register error', error);
      return { status: 'failed' };
    }

    if (data.user) {
      await service.from('profiles').upsert({
        id: data.user.id,
        email: normalizedEmail,
        is_admin: false,
      });
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    return { status: 'failed' };
  }
};

export async function microsoftLogin() {
  throw new Error('Microsoft login is disabled.');
}

export async function handleSignOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
