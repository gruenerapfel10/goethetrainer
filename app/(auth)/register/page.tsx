'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { WavyBackground } from '@/components/ui/wavy-background';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';
import { AuthNavbar } from '@/components/auth-navbar';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { register, type RegisterActionState } from '../actions';

const getRedirectTo = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : undefined;

export default function Page() {
  const router = useRouter();
  const t = useTranslations();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: 'idle' }
  );

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast.error(t('register.errors.userExists'));
    } else if (state.status === 'user_exists_google') {
      toast.error('An account with this email already uses Google. Please continue with Google.');
    } else if (state.status === 'failed') {
      toast.error(t('register.errors.createFailed'));
    } else if (state.status === 'invalid_data') {
      toast.error(t('register.errors.invalidData'));
    } else if (state.status === 'success') {
      toast.success(t('register.success'));
      setIsSuccessful(true);
      router.push('/dashboard');
    }
  }, [state.status, router, t]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectTo(),
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Google sign-in failed', error);
      toast.error('Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const isDarkMode = theme === 'dark';

  return (
    <div className="relative min-h-dvh w-full overflow-hidden" style={{ backgroundColor: `hsl(var(--brand-color-light))` }}>
      <AuthNavbar
        rightLink="/login"
        rightText={t('register.login.text')}
        rightButtonText={t('register.login.link')}
      />
      <div className="absolute inset-0">
        <WavyBackground
          containerClassName="w-full h-full"
          colors={[
            'hsl(257.14 73.5% 28%)',
            'hsl(221.2 83.2% 60%)',
            'hsl(262.1 83.3% 65%)',
          ]}
          blur={10}
          speed="fast"
          waveOpacity={0.3}
        />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center lg:flex-row lg:items-stretch lg:justify-between">
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-8 relative">
          <div className="absolute top-8 left-8 z-20">
            <Logo size="medium" invert={isDarkMode} showIcon={true} showTitle={true} showTagline={true} />
          </div>
          <div className="relative z-20 text-center space-y-8">
            <div>
              <h2 className="text-5xl font-bold text-white leading-tight">Precision Science</h2>
              <p className="text-lg text-white/80">AI-powered medical future</p>
            </div>
            <div className="mt-4">
              <MultiStepLoader
                loadingStates={[
                  { text: 'Analyzing patient data' },
                  { text: 'Processing medical records' },
                  { text: 'Generating insights' },
                  { text: 'Preparing results' },
                ]}
                loading={true}
                duration={1000}
                loop={true}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md lg:max-w-4xl lg:min-h-[70vh] rounded-3xl bg-card shadow-2xl border border-white/10 p-6 sm:p-8 lg:p-10"
          >
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {t('register.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('register.subtitle')}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignIn}
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.4-.2-2H12Z"
                  />
                  <path
                    fill="#34A853"
                    d="M6.5 14.3c-.3-.8-.5-1.6-.5-2.3s.2-1.6.5-2.3l-3-2.3C2.6 8.6 2 10.2 2 12s.6 3.4 1.5 4.6l3-2.3Z"
                  />
                  <path
                    fill="#4A90E2"
                    d="M12 19.6c1.8 0 3.4-.6 4.6-1.7l-3.1-2.4c-.8.5-1.7.8-2.7.8-2.1 0-3.8-1.4-4.4-3.3l-3 2.3C4.5 17.9 8 19.6 12 19.6Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12 6.4c1 0 1.9.3 2.6.9l2.7-2.7C16.4 3.5 14.3 2.6 12 2.6 8 2.6 4.5 4.3 2.5 7.1l3 2.3c.6-1.9 2.3-3.3 4.5-3.3Z"
                  />
                </svg>
                {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
              </Button>

              <AuthForm action={handleSubmit} defaultEmail={email}>
                <SubmitButton isSuccessful={isSuccessful}>
                  {t('register.submitButton')}
                </SubmitButton>
              </AuthForm>

              <p className="text-center text-sm text-muted-foreground">
                {t('register.login.text')}{' '}
                <Link href="/login" className="font-semibold text-foreground hover:underline">
                  {t('register.login.link')}
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
