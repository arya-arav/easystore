import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminLayout } from './admin-layout';

export const metadata: Metadata = {
  title: 'Admin',
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  return <AdminLayout user={session.user}>{children}</AdminLayout>;
}
