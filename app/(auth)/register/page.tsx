'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

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
      router.push('/');
    }
  }, [state.status, router, t]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card backdrop-blur-xl"
      >
        <div className="space-y-8 p-8">
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
  );
}
