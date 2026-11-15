import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from './client';

export const metadata: Metadata = { title: 'My Account' };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  return <DashboardClient user={session!.user as any} />;
}
