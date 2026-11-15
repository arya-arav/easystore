import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Reports which required settings the server can see (true/false only, never values).
export async function GET() {
  const has = (name: string) => !!process.env[name];
  return NextResponse.json({
    env: {
      DATABASE_URL: has('DATABASE_URL'),
      NEXTAUTH_SECRET: has('NEXTAUTH_SECRET'),
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
      RAZORPAY_KEY_ID: has('RAZORPAY_KEY_ID'),
      GOOGLE_CLIENT_ID: has('GOOGLE_CLIENT_ID'),
    },
  });
}
