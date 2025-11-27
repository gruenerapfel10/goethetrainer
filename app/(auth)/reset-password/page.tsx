'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WavyBackground } from '@/components/ui/wavy-background';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    // Supabase can return either `code` (PKCE) or `token_hash` (legacy)
    const c = searchParams.get('code') || searchParams.get('token_hash');
    setCode(c);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    if (!code) {
      toast.error('Missing reset code. Please use the link from your email.');
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        throw updateError;
      }

      toast.success('Password updated. You can now sign in.');
      router.push('/login');
    } catch (err: any) {
      console.error('[reset-password] error', err);
      toast.error(err?.message || 'Failed to update password.');
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
              Set a new password
            </h2>
            <p className="text-lg text-white/80">
              Finish resetting your account.
            </p>
          </div>
          <div className="mt-4">
            <MultiStepLoader
              loadingStates={[
                { text: 'Validating your reset link' },
                { text: 'Securing your account' },
                { text: 'Updating password' },
                { text: 'Almost done' },
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
            Back to login
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
                  Reset password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a new password for your account.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="text-label-text font-normal">
                    New password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    className="bg-muted text-md md:text-sm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm" className="text-label-text font-normal">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    className="bg-muted text-md md:text-sm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Used the wrong email?{' '}
                <Link href="/forgot-password" className="font-semibold text-foreground hover:underline">
                  Request another link
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
