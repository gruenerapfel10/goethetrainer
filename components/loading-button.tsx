'use client';

import React from 'react';
import {Button} from '@/components/ui/button';
import {LoaderIcon} from '@/components/icons';
import {cn} from '@/lib/utils';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LoadingButton({
                                children,
                                isLoading,
                                loadingText,
                                className,
                                variant = 'default',
                                size = 'default',
                                ...props
                              }: LoadingButtonProps) {
  return (
    <Button
      type={isLoading ? 'button' : 'submit'}
      aria-disabled={isLoading}
      disabled={isLoading}
      className={cn("relative flex items-center justify-center gap-2", className)}
      variant={variant}
      size={size}
      {...props}
    >
      {children}

      {isLoading && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {isLoading ? (loadingText || 'Loading') : 'Submit form'}
      </output>
    </Button>
  );
}
