import { redirect } from 'next/navigation';
import React from 'react';
import Dashboard from '@/components/dashboard/dashboard';
import { auth } from '../../(auth)/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect('/');
  }

  return <Dashboard userId={session.user.id} />;
}
