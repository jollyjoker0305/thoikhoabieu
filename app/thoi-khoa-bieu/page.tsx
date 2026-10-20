import type { Metadata } from 'next';
import { HomeClient } from '@/components/home-client';
import { getSessionUser } from '@/lib/auth';
import { loadSchedule } from '@/lib/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thời khóa biểu lớp 6A01',
  description: 'Thời khóa biểu lớp 6A01, in được khổ A4 và A5 ngang.',
};

export default async function Page() {
  const [schedule, user] = await Promise.all([loadSchedule(), getSessionUser()]);
  return <HomeClient initialSchedule={schedule} initialAdmin={!!user} />;
}
