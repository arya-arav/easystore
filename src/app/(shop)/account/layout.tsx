import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AccountLayout } from './account-layout';

export default async function AccountSectionLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login?callbackUrl=/account');
  return <AccountLayout user={session.user}>{children}</AccountLayout>;
}
