import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyLoginToken } from '@/lib/login-token';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const prismaAdapter = PrismaAdapter(prisma) as any;

// Override createUser to handle existing email/password accounts
const customAdapter = {
  ...prismaAdapter,
  async createUser(data: any) {
    // If user with this email already exists, return them instead of creating a duplicate
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return existing;
    return prismaAdapter.createUser(data);
  },
};

export const authOptions: NextAuthOptions = {
  adapter: customAdapter,
  providers: [
    // Google OAuth — requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
              role: 'CUSTOMER',
            };
          },
        })]
      : []),

    // OTP login provider (email OTP or WhatsApp OTP)
    CredentialsProvider({
      id: 'otp',
      name: 'OTP',
      credentials: {
        userId: { type: 'text' },
        loginToken: { type: 'text' },
      },
      async authorize(credentials) {
        // Only with the signed pass /api/auth/verify-otp gives after a correct code
        if (!credentials?.userId || !(await verifyLoginToken(credentials.userId, credentials.loginToken))) return null;
        const user = await prisma.user.findUnique({ where: { id: credentials.userId } });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Block login if email not verified (skip for ADMIN/SELLER)
        if (!user.emailVerified && user.role === 'CUSTOMER') {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google sign-in for existing email/password users
      if (account?.provider === 'google' && profile?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: profile.email },
          include: { accounts: true },
        });

        if (existing) {
          // Check if Google account is already linked
          const alreadyLinked = existing.accounts.some(a => a.provider === 'google');
          if (!alreadyLinked) {
            // Link Google account to existing user
            await prisma.account.create({
              data: {
                userId: existing.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
            // Mark email as verified if not already
            if (!existing.emailVerified) {
              await prisma.user.update({
                where: { id: existing.id },
                data: { emailVerified: new Date() },
              });
            }
          }
          // Allow sign-in — NextAuth will use the existing user
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'CUSTOMER';
        token.id = user.id;
      }
      // Staff roles are re-read on each request, so removing someone's admin access
      // takes effect straight away rather than when their sign-in expires.
      else if (token.id && (token.role === 'ADMIN' || token.role === 'SELLER')) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
        token.role = dbUser?.role || 'CUSTOMER';
      }
      // For Google users, role may not be on the token yet — fetch from DB
      if (!token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
        token.role = dbUser?.role || 'CUSTOMER';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
