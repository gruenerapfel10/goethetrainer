'use client';

import { LearningSessionProvider } from '@/lib/sessions/learning-session-context';

export function LearningSessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <LearningSessionProvider>{children}</LearningSessionProvider>;
}
