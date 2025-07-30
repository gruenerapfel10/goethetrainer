'use client';

import { useLogo } from '../context/logo-context';
import Image from 'next/image';

export function LogoComponent() {
  const { state } = useLogo();

  // Always show the skeleton while loading
  if (state.isLoading) {
    return (
      <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
    );
  }

  // Only show the logo when we have a currentLogo and loading is complete
  if (state.currentLogo) {
    return (
      <Image
        src={state.currentLogo.url}
        alt="Logo"
        fill
        className="object-contain"
      />
    );
  }

  // If no logo is set yet but loading is done, show skeleton
  return <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />;
}
