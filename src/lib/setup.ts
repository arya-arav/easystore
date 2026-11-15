import { prisma } from '@/lib/prisma';

// A fresh install has no admin yet: the setup wizard (/setup) creates one.
// Once an admin exists that never changes back, so the answer is remembered.
let done = false;

export async function needsSetup(): Promise<boolean> {
  if (done) return false;
  try {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins > 0) done = true;
    return admins === 0;
  } catch {
    return false; // database not reachable: don't send people to setup
  }
}

export function markSetupDone() {
  done = true;
}
