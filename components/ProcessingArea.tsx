'use client';

import React from 'react';

interface ProcessingAreaProps {
  className?: string;
}

export const ProcessingArea: React.FC<ProcessingAreaProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${className}`}>
      {/* Main Processing Area Box */}
      <div className="border border-foreground w-full" style={{ height: '60px' }}></div>

      {/* Processing Boxes Row */}
      <div className="flex gap-0.5 border-t border-b border-foreground w-full">
        {[...Array(23)].map((_, i) => (
          <div key={i} className="flex-1 border-r border-foreground first:border-l" style={{ height: '16px' }}></div>
        ))}
      </div>
    </div>
  );
};
