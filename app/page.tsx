import { HomeClient } from '@/components/home-client';
import { getSessionUser } from '@/lib/auth';
import { loadSchedule } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [schedule, user] = await Promise.all([loadSchedule(), getSessionUser()]);
  return <HomeClient initialSchedule={schedule} initialAdmin={!!user} />;
}
