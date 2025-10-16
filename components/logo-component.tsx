'use client';

import { useLogo } from '../context/logo-context';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function LogoComponent({ collapsed }: { collapsed?: boolean }) {
  const { state } = useLogo();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (collapsed) {
    return (
      <Image
        src="/moterra-logo-s.svg"
        alt="Logo"
        width={32}
        height={32}
        className="object-contain"
        priority
      />
    );
  }

  if (!mounted || state.isLoading) {
    return (
      <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
    );
  }

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

  return <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded" />;
}
