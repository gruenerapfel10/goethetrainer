'use client';

import { useLogo } from '../context/logo-context';
import Image from 'next/image';

export function LogoComponent({ collapsed }: { collapsed?: boolean }) {
  const { state } = useLogo();

  if (collapsed) {
    return (
      <Image
        src="/mua-logo-128x128-blue.png"
        alt="Logo"
        width={32}
        height={32}
        className="object-contain"
      />
    );
  }

  // Always show the skeleton while loading
  if (state.isLoading) {
    return (
      <div className="h-10 w-40 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
    );
  }

  // Only show the logo when we have a currentLogo and loading is complete
  if (state.currentLogo) {
    return (
      <Image
        src={state.currentLogo.url}
        alt="Logo"
        width={160}
        height={40}
        className="object-contain max-w-full max-h-full"
      />
    );
  }

  // If no logo is set yet but loading is done, show skeleton
  return <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded" />;
}
