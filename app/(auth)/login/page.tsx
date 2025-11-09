'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { WavyBackground } from '@/components/ui/wavy-background';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { login, type LoginActionState, microsoftLogin } from '../actions';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: 'idle' }
  );

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true);
      microsoftLogin();
    } catch (error) {
      console.error('Microsoft auth error:', error);
      toast.error(t('login.errors.microsoftAuth'));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error(t('login.errors.invalidCredentials'));
    } else if (state.status === 'invalid_data') {
      toast.error(t('login.errors.invalidData'));
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      router.push('/dashboard');
    }
  }, [state.status, router, t]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Left Side - Brand Color with Wavy Background */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-8 relative overflow-hidden" style={{ backgroundColor: `hsl(var(--brand-color-light))` }}>
        <div className="absolute inset-0">
          <WavyBackground
            containerClassName="w-full h-full"
            colors={['#ffffff', '#0A0915', '#1a1847']}
            blur={10}
            speed="fast"
            waveOpacity={0.3}
          />
        </div>
        <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo_dark.png"
              alt="Goethe Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <div className="text-2xl font-bold tracking-tight text-white">Faust</div>
          </div>
        </div>
        <div className="relative z-20 text-center space-y-8">
          <div>
            <h2 className="text-5xl font-bold text-white leading-tight">
              Accelerate Learning
            </h2>
            <p className="text-lg text-white/80">
              Master German with AI-powered insights
            </p>
          </div>
          <div className="mt-4">
            <MultiStepLoader
              loadingStates={[
                { text: 'Preparing your learning session' },
                { text: 'Personalizing content for you' },
                { text: 'Analyzing your progress' },
                { text: 'Ready to learn' },
              ]}
              loading={true}
              duration={1000}
              loop={true}
            />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col bg-card backdrop-blur-xl">
        {/* Top Navbar in Right Panel */}
        <div className="flex items-center justify-end gap-8 p-8">
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </Link>
          <Button variant="default" size="sm">
            Sign In
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {t('login.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('login.subtitle')}
              </p>
            </div>

            {/* Microsoft Sign In */}
            <Button
              type="button"
              variant="outline"
              className="relative w-full overflow-hidden border-border bg-background hover:bg-accent text-foreground transition-colors"
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                  <span>{t('login.microsoftButton.loading')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M11 3h9v9h-9z M11 18h9v-3.8h-9z M0 3h9v9H0z M0 18h9v-3.8H0z" />
                  </svg>
                  <span>{t('login.microsoftButton.default')}</span>
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-4 text-muted-foreground uppercase tracking-wider">
                  {t('login.divider')}
                </span>
              </div>
            </div>

            {/* Email Form */}
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>
                {t('login.submitButton')}
              </SubmitButton>
            </AuthForm>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-muted-foreground">
              {t('login.signup.text')}{' '}
              <Link
                href="/register"
                className="font-semibold text-foreground hover:underline"
              >
                {t('login.signup.link')}
              </Link>{' '}
              {t('login.signup.suffix')}
            </p>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
