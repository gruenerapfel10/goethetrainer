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
    <div className="h-full bg-gray-200 dark:bg-sidebar flex items-center justify-center overflow-hidden">
      <AnswerSheet />

    </div>
  );
}
