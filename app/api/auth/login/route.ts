import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  FOURTEEN_DAYS,
  SESSION_COOKIE,
  createToken,
  credentialsMatch,
  sessionCookieOptions,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!credentialsMatch(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, createToken(username.slice(0, 64)), sessionCookieOptions(FOURTEEN_DAYS));
  return NextResponse.json({ ok: true });
}
