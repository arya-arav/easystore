// Creates an admin account, or resets an existing account's password and makes it an admin.
// Usage: node scripts/create-admin.mjs you@example.com "a-strong-password" ["Your Name"]
// Needs DATABASE_URL (reads .env / .env.local if present).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!process.env.DATABASE_URL && fs.existsSync(file)) {
    const m = fs.readFileSync(file, 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (m) process.env.DATABASE_URL = m[1];
  }
}

const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs you@example.com "a-strong-password" ["Your Name"]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use a password with at least 8 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  update: { password: hash, role: 'ADMIN', emailVerified: new Date() },
  create: { email: email.toLowerCase(), name, password: hash, role: 'ADMIN', emailVerified: new Date() },
});
console.log(`Admin ready: ${user.email}`);
await prisma.$disconnect();
