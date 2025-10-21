'use client';

import { AnswerSheet } from '@/components/AnswerSheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function DemoPage() {
  const [scale, setScale] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center overflow-hidden">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        <AnswerSheet />
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
