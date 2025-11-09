'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const GRADE_BANDS = [
  { min: 90, label: 'sehr gut', color: 'text-green-700' },
  { min: 80, label: 'gut', color: 'text-emerald-600' },
  { min: 70, label: 'befriedigend', color: 'text-blue-600' },
  { min: 60, label: 'ausreichend', color: 'text-yellow-600' },
  { min: 0, label: 'nicht bestanden', color: 'text-red-600' },
];

function resolveGradeInfo(percentage: number) {
  return GRADE_BANDS.find(band => percentage >= band.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

interface FaustBadgeProps {
  percentage: number;
  className?: string;
  latestSessionPercentage?: number;
}

export function FaustBadge({ percentage, className, latestSessionPercentage }: FaustBadgeProps) {
  const [displayedPercentage, setDisplayedPercentage] = useState(0);
  const gradeInfo = resolveGradeInfo(percentage);

  const difference = latestSessionPercentage !== undefined ? latestSessionPercentage - percentage : 0;
  const isPositive = difference > 0;
  const isNeutral = difference === 0;

  useEffect(() => {
    let currentValue = 0;
    const increment = Math.ceil(percentage / 30);
    const interval = setInterval(() => {
      currentValue += increment;
      if (currentValue >= percentage) {
        setDisplayedPercentage(percentage);
        clearInterval(interval);
      } else {
        setDisplayedPercentage(currentValue);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [percentage]);

  return (
    <div className={cn("relative overflow-hidden border border-primary px-4 py-6 flex flex-col items-center justify-center text-center gap-3 bg-primary text-primary-foreground", className)}>
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <div className="grid grid-cols-12 gap-x-1.5 gap-y-1 w-full h-full">
          {Array.from({ length: 120 }).map((_, index) => (
            <div
              key={`logo-tile-${index}`}
              className="flex items-center justify-center"
            >
              <Image
                src="/logo_dark.png"
                alt="Faust Logo"
                width={20}
                height={20}
                className="w-5 h-5 object-contain dark:hidden"
              />
              <Image
                src="/logo.png"
                alt="Faust Logo"
                width={20}
                height={20}
                className="w-5 h-5 object-contain hidden dark:block"
              />
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/80 relative z-10 -mt-6">Prädikat</p>
      <div className="relative z-10">
        {latestSessionPercentage !== undefined && (
          <p className={cn('absolute -top-4 -left-12 text-2xl font-bold tracking-wide', isPositive ? 'text-green-300' : isNeutral ? 'text-primary-foreground' : 'text-red-300')}>
            {isPositive ? '+' : ''}{difference}%
          </p>
        )}
        <p className="text-6xl font-black text-primary-foreground leading-none">
          {displayedPercentage}%
        </p>
      </div>
      <p className={cn('text-2xl font-bold tracking-wide relative z-10', gradeInfo.color === 'text-red-600' ? 'text-primary-foreground' : 'text-primary-foreground') }>
        {gradeInfo.label}
      </p>
    </div>
  );
}
