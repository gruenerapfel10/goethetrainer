'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const chatId = generateUUID();
    router.push(`/chat/${chatId}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold">Goethe Trainer</h1>
        <p className="text-lg mt-4">Starting new chat...</p>
      </div>
    </div>
  );
}
