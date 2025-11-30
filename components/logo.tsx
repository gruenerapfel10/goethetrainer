'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xl' | 'mobile' | 'auto';
  invert?: boolean;
  showIcon?: boolean;
  showTitle?: boolean;
  showTagline?: boolean;
}

export function Logo({
  size = 'medium',
  invert = false,
  showIcon = true,
  showTitle = true,
  showTagline = true,
}: LogoProps) {
  const sizeConfig = {
    small: {
      container: { h: 'h-9', w: 'w-9' },
      text: { w: 'w-24' },
    },
    medium: {
      container: { h: 'h-16', w: 'w-16' },
      text: { w: 'w-40' },
    },
    large: {
      container: { h: 'h-20', w: 'w-20' },
      text: { w: 'w-60' },
    },
    xl: {
      container: { h: 'h-24', w: 'w-24' },
      text: { w: 'w-80' },
    },
    mobile: {
      container: { h: 'h-12', w: 'w-12' },
      text: { w: 'w-40' },
    },
    auto: {
      container: { h: 'h-auto', w: 'w-auto' },
      text: { w: 'w-auto' },
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {showIcon && (
        <div className="flex items-center justify-center">
          <Image
            src={invert ? '/logo_dark.png' : '/logo.png'}
            alt="Faust Logo Icon"
            width={64}
            height={64}
            className={`${config.container.h} ${config.container.w} object-contain`}
            priority
          />
        </div>
      )}

      {(showTitle || showTagline) && (
        <div className="flex flex-col justify-center flex-1 gap-0.5">
          {showTitle && (
            <div className="flex items-center">
              <span className={`${config.text.w} text-3xl font-bold tracking-tight text-foreground`}>Faust</span>
            </div>
          )}

          {showTagline && (
            <div className="flex items-center">
              <span className={`${config.text.w} text-sm text-muted-foreground`}>AI-powered German learning</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
