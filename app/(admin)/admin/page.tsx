// app/admin/page.tsx
import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/admin-dashboard';
import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard for managing files and users',
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  // TODO: Implement proper admin role checking with Firebase custom claims
  // For now, just require authentication
  
  return <AdminDashboard />;
}
