import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'tkb_session';
const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

function adminUser() {
  return process.env.ADMIN_USER || 'ad';
}

function adminPass() {
  return process.env.ADMIN_PASSWORD || '6a01';
}

function secret() {
  return process.env.AUTH_SECRET || 'tkb-6a01-local-secret';
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function credentialsMatch(username: string, password: string) {
  const user = username.slice(0, 64);
  const pass = password.slice(0, 64);
  return safeEqual(user, adminUser()) && safeEqual(pass, adminPass());
}

export function createToken(username: string) {
  const body = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + FOURTEEN_DAYS * 1000 }),
  ).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || token.split('.').length !== 2) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as { u?: unknown; exp?: unknown };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (data.u !== adminUser()) return null;
    return adminUser();
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function getSessionUser() {
  const jar = await cookies();
  return verifyToken(jar.get(SESSION_COOKIE)?.value);
}

export { FOURTEEN_DAYS };
