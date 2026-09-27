import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseSchedule } from '@/lib/schedule';
import { loadSchedule, saveSchedule } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const schedule = await loadSchedule();
  return NextResponse.json(schedule, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const raw = await request.text();
  if (raw.length > 150_000) {
    return NextResponse.json({ error: 'Dữ liệu quá lớn' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const schedule = parseSchedule(json);
  if (!schedule) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  try {
    const storage = await saveSchedule(schedule);
    return NextResponse.json({ ok: true, storage, schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không lưu được';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
