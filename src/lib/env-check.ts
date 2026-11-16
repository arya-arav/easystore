// Checks the server settings (environment variables, or Cloudflare secrets/vars) for missing or half-done
// setup, so the admin dashboard can say what's wrong in plain words. Only names are reported,
// never values. On Cloudflare, settings arrive with each request, so this runs per request
// (it's cheap) rather than once at startup.

export interface EnvProblem {
  /** Setting(s) to add, e.g. "STRIPE_WEBHOOK_SECRET" */
  name: string;
  /** "error": something is broken now. "warning": a feature is off or degraded. */
  level: 'error' | 'warning';
  /** What goes wrong without it */
  impact: string;
}

export function checkEnv(env: Record<string, string | undefined> = process.env): EnvProblem[] {
  const has = (n: string) => !!env[n]?.trim();
  const problems: EnvProblem[] = [];
  const add = (name: string, level: EnvProblem['level'], impact: string) => problems.push({ name, level, impact });

  if (!has('DATABASE_URL')) add('DATABASE_URL', 'error', 'The store cannot reach its database.');
  if (!has('NEXTAUTH_SECRET') && !has('AUTH_SECRET')) add('NEXTAUTH_SECRET', 'error', 'Sign-in, login codes and unsubscribe links are not secure.');
  if (!has('NEXTAUTH_URL')) add('NEXTAUTH_URL', 'warning', 'Sign-in links and redirects may point to the wrong address.');

  if (has('STRIPE_SECRET_KEY') && !has('STRIPE_WEBHOOK_SECRET')) {
    add('STRIPE_WEBHOOK_SECRET', 'error', 'Card payments are only recorded if the shopper returns to the store after paying; if they close the tab, the order stays unpaid.');
  }
  if (has('RAZORPAY_KEY_ID') !== has('RAZORPAY_KEY_SECRET')) {
    add(has('RAZORPAY_KEY_ID') ? 'RAZORPAY_KEY_SECRET' : 'RAZORPAY_KEY_ID', 'warning', 'Razorpay needs both keys; it is switched off until both are set.');
  }
  if (has('RAZORPAY_KEY_ID') && has('RAZORPAY_KEY_SECRET') && !has('RAZORPAY_WEBHOOK_SECRET')) {
    add('RAZORPAY_WEBHOOK_SECRET', 'warning', 'Razorpay payments are only recorded when the shopper returns to the store; the webhook refuses all events.');
  }
  if (has('GOOGLE_CLIENT_ID') !== has('GOOGLE_CLIENT_SECRET')) {
    add(has('GOOGLE_CLIENT_ID') ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID', 'warning', 'Sign in with Google needs both settings; the button is hidden until both are set.');
  }

  return problems;
}
