// Short-lived signed pass from /api/auth/verify-otp to the "otp" sign-in provider, so
// signing in needs a code that was actually verified, not just a user id.

const enc = new TextEncoder();
const TTL_MS = 5 * 60 * 1000;

async function hmac(data: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createLoginToken(userId: string) {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${await hmac(`otp-login:${userId}:${exp}`)}`;
}

export async function verifyLoginToken(userId: string, token: string | undefined | null) {
  if (!token) return false;
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = await hmac(`otp-login:${userId}:${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
