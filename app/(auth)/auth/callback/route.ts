import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/clients';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth', url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !data.session?.user) {
    return NextResponse.redirect(new URL('/login?error=oauth_exchange', url.origin));
  }

  try {
    const service = createSupabaseServiceClient();
    await service
      .from('profiles')
      .upsert({
        id: data.session.user.id,
        email: data.session.user.email,
        is_admin: false,
      })
      .select();
  } catch (profileError) {
    console.error('Failed to upsert profile after Google sign-in', profileError);
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
