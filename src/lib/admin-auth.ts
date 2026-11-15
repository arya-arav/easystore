import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type StaffRole = 'ADMIN' | 'SELLER';

/** The signed-in staff member when their role is allowed, otherwise null (answer 401). */
export async function requireStaff(roles: StaffRole[] = ['ADMIN', 'SELLER']) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as StaffRole | undefined;
  if (!session?.user?.id || !role || !roles.includes(role)) return null;
  return session.user;
}
