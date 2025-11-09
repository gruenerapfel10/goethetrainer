'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { WavyBackground } from '@/components/ui/wavy-background';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { register, type RegisterActionState } from '../actions';

export default function Page() {
  const router = useRouter();
  const t = useTranslations();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: 'idle' }
  );

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast.error(t('register.errors.userExists'));
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
                {t('register.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('register.subtitle')}
              </p>
            </div>

            {/* Email Form */}
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>
                {t('register.submitButton')}
              </SubmitButton>
            </AuthForm>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground">
              {t('register.login.text')}{' '}
              <Link
                href="/login"
                className="font-semibold text-foreground hover:underline"
              >
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
