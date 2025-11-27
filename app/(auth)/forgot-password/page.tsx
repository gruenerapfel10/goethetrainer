'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { WavyBackground } from '@/components/ui/wavy-background';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      toast.error('Please enter a valid email.');
      return;
    }
    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();

    // Build redirect based on runtime origin to avoid mismatch
    const origin =
      typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002');
    const redirectTo = `${origin}/reset-password`;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email.');
        return;
      }
      toast.success('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      console.error('[forgot-password] reset error', err);
      toast.error(err?.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full bg-background">
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
              Reset your password
            </h2>
            <p className="text-lg text-white/80">
              Receive a secure link to set a new password.
            </p>
          </div>
          <div className="mt-4">
            <MultiStepLoader
              loadingStates={[
                { text: 'Generating secure link' },
                { text: 'Preparing your account' },
                { text: 'Almost there' },
                { text: 'Check your inbox' },
              ]}
              loading={true}
              duration={1000}
              loop={true}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 flex-col bg-card backdrop-blur-xl">
        <div className="flex items-center justify-end gap-8 p-8">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('login.title')}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Forgot password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a password reset link.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-label-text font-normal">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    className="bg-muted text-md md:text-sm"
                    type="email"
                    placeholder="user@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Remembered your password?{' '}
                <Link href="/login" className="font-semibold text-foreground hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
