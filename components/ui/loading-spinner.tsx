import React from 'react';
import {LoaderIcon} from '@/components/icons';
import {cn} from '@/lib/utils';


export function LoadingSpinner({
                                 className
                               }: {
  className?: string
}) {
  return (
    <span className="animate-spin absolute right-4">
          <LoaderIcon/>
        </span>
  );
}