// app/admin/page.tsx
import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/admin-dashboard';
// Auth removed - no authentication needed
// import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard for managing files and users',
};

export default async function AdminPage() {
  // Auth removed - no authentication needed
  // const session = await auth();

  // No auth checks needed - always show admin dashboard
  // if (!session?.user) {
  //   redirect('/');
  // }

  // TODO: Implement proper admin role checking with Firebase custom claims
  // For now, just require authentication
  
  return <AdminDashboard />;
}
