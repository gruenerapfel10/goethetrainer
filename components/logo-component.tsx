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

  // Show the horizontal logo for expanded sidebar
  return (
    <Image
      src="/mua-logo-horizontal-blue-bg.png"
      alt="MUA Logo"
      width={160}
      height={40}
      className="object-contain max-w-full max-h-full"
    />
  );
}
