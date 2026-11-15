import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { needsSetup } from '@/lib/setup';
import { SetupWizard } from './wizard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'Set up your store' }, robots: { index: false } };

export default async function SetupPage() {
  if (!(await needsSetup())) redirect('/admin');
  return <SetupWizard />;
}
