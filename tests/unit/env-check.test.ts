import { describe, expect, it } from 'vitest';
import { checkEnv } from '@/lib/env-check';

const complete = {
  DATABASE_URL: 'postgres://x',
  NEXTAUTH_SECRET: 's',
  NEXTAUTH_URL: 'https://shop.example.com',
  STRIPE_SECRET_KEY: 'sk',
  STRIPE_WEBHOOK_SECRET: 'whsec',
};
const names = (env: Record<string, string | undefined>) => checkEnv(env).map((p) => p.name);

describe('server settings check', () => {
  it('reports nothing for a complete setup', () => {
    expect(checkEnv(complete)).toEqual([]);
  });

  it('flags missing required settings as errors', () => {
    const problems = checkEnv({ ...complete, DATABASE_URL: undefined, NEXTAUTH_SECRET: '  ' });
    expect(problems.filter((p) => p.level === 'error').map((p) => p.name)).toEqual(['DATABASE_URL', 'NEXTAUTH_SECRET']);
  });

  it('accepts AUTH_SECRET instead of NEXTAUTH_SECRET', () => {
    expect(names({ ...complete, NEXTAUTH_SECRET: undefined, AUTH_SECRET: 's' })).toEqual([]);
  });

  it('flags Stripe switched on without its webhook secret', () => {
    expect(names({ ...complete, STRIPE_WEBHOOK_SECRET: undefined })).toEqual(['STRIPE_WEBHOOK_SECRET']);
    // Stripe not used at all: nothing to say
    expect(names({ ...complete, STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined })).toEqual([]);
  });

  it('flags half-configured Razorpay and Google sign-in', () => {
    expect(names({ ...complete, RAZORPAY_KEY_ID: 'rzp' })).toEqual(['RAZORPAY_KEY_SECRET']);
    expect(names({ ...complete, RAZORPAY_KEY_ID: 'rzp', RAZORPAY_KEY_SECRET: 's' })).toEqual(['RAZORPAY_WEBHOOK_SECRET']);
    expect(names({ ...complete, GOOGLE_CLIENT_SECRET: 'g' })).toEqual(['GOOGLE_CLIENT_ID']);
  });
});
