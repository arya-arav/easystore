import { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { checkEnv } from '@/lib/env-check';
import { DashboardStats } from './stats';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  // Admin-only (the admin layout checks the session): which server settings are missing
  const problems = checkEnv();
  return (
    <>
      {problems.length > 0 && (
        <div role="status" className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Server settings need attention
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {problems.map((p) => (
              <li key={p.name}>
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px] dark:bg-amber-900/60">{p.name}</code>
                {p.level === 'error' ? ' (required)' : ''}: {p.impact}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] opacity-80">
            Add them where your host keeps environment variables (Cloudflare: Workers → your worker → Settings → Variables and Secrets, or <code className="font-mono">wrangler secret put NAME</code>; Vercel, Dokploy, Coolify: project environment; Docker: <code className="font-mono">.env</code>), then redeploy.
          </p>
        </div>
      )}
      <DashboardStats />
    </>
  );
}
