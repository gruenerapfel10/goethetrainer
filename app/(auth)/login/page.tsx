'use client';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
        </div>
      </motion.div>
    </div>
  );
}
