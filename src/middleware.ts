import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Admin routes protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'SELLER')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Account routes protection
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // API admin routes protection
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/api/admin/:path*'],
};
