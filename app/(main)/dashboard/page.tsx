'use client';

import { SessionGridCard } from '@/components/dashboard/session-grid-card';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';

export default function DashboardPage() {
  const sessionTypes = [
    SessionTypeEnum.READING,
    SessionTypeEnum.WRITING,
    SessionTypeEnum.LISTENING,
    SessionTypeEnum.SPEAKING,
  ];

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your learning sessions
          </p>
        </div>
      </div>

      {/* Vertical Stack of Session Cards */}
      <div className="space-y-6">
        {sessionTypes.map((sessionType) => (
          <SessionGridCard key={sessionType} sessionType={sessionType} />
        ))}
      </div>
    </div>
  );
}
