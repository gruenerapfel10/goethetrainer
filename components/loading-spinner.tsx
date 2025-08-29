import React from 'react';
import {LoaderIcon} from '@/components/icons';


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