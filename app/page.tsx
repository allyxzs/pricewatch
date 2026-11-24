import Dashboard from '@/components/dashboard';
import { isDemo } from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <Dashboard demo={isDemo()} />;
}
