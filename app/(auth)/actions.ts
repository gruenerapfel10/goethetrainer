'use server';

import { z } from 'zod';
import { createUser, getUser } from '@/lib/db/queries';
import { signIn, signOut } from './auth';
import { redirect } from 'next/navigation';

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

    const result = await signIn('credentials', {
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password,
      redirect: false,
    });

    if (result?.error) {
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
    const [user] = await getUser(normalizedEmail);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(normalizedEmail, validatedData.password);
    await signIn('credentials', {
      email: normalizedEmail,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    return { status: 'failed' };
  }
};

export async function microsoftLogin() {
  try {
    return await signIn('microsoft-entra-id', {
      redirect: true,
      callbackUrl: '/',
      // Add this to help with PKCE issues
      redirectTo: '/'
    });
  } catch (error) {
    console.error('[auth] Microsoft login error:', error);
    // You might want to redirect to an error page or login with an error message
    throw error;
  }
}

export async function handleSignOut() {
  await signOut({ redirect: false });
  redirect('/login');
}