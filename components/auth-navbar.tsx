'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface AuthNavbarProps {
  rightLink?: string;
  rightText?: string;
  rightButtonText?: string;
  rightButtonVariant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
}

export function AuthNavbar({
  rightLink = '/register',
  rightText,
  rightButtonText,
  rightButtonVariant = 'default',
}: AuthNavbarProps) {
  const t = useTranslations();

  const displayText = rightText || t('login.signup.text', { defaultValue: "Don't have an account?" });
  const displayButtonText = rightButtonText || t('login.signup.link', { defaultValue: 'Sign up' });

  return (
    <nav className="fixed top-0 right-0 z-50 p-6">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {displayText}
        </p>
        <Link href={rightLink}>
          <Button variant={rightButtonVariant} size="sm">
            {displayButtonText}
          </Button>
        </Link>
      </div>
    </nav>
  );
}
