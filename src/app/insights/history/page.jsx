import { createServerComponentClient } from '@supabase/auth-helpers-nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InsightTimeline from '@/components/InsightTimeline';

export const dynamic = 'force-dynamic';

export default async function InsightHistoryPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: insights, error } = await supabase
    .from('cortex_insights')
    .select('id, insight, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching insights:', error);
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 text-red-500">
        Error loading insights. Please try again.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Cortex Insight History</h1>
      {insights && insights.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No insights generated yet. Keep studying to get your first insights!</p>
      ) : (
        <InsightTimeline initialInsights={insights || []} />
      )}
    </div>
  );
}
