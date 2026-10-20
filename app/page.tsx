import type { Metadata } from 'next';
import { HomeScene } from '@/components/home-scene';
import { loadSchedule } from '@/lib/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lớp 6A01',
  description: 'Thời khóa biểu và bảng việc lớp 6A01.',
};

export default async function Page() {
  const schedule = await loadSchedule();
  return <HomeScene schedule={schedule} />;
}
