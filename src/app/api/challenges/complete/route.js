import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { challengeId, xpReward } = await request.json();

  if (!challengeId || xpReward === undefined) {
    return NextResponse.json({ success: false, message: 'Challenge ID and XP reward are required.' }, { status: 400 });
  }

  // Start a transaction to ensure atomicity
  // Supabase client-side transactions are not directly supported via the client library in this manner.
  // We'll perform two updates, handling potential failures sequentially.

  try {
    // 1. Mark challenge as completed
    const { error: updateChallengeError } = await supabase
      .from('daily_challenges')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', challengeId)
      .eq('user_id', user.id);

    if (updateChallengeError) {
      console.error('Error updating daily challenge status:', updateChallengeError);
      return NextResponse.json({ success: false, message: 'Failed to complete challenge.' }, { status: 500 });
    }

    // 2. Award XP to user profile
    const { data: profile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('xp, weekly_xp')
      .eq('id', user.id)
      .single();

    if (fetchProfileError) {
      console.error('Error fetching user profile for XP update:', fetchProfileError);
      return NextResponse.json({ success: false, message: 'Failed to retrieve profile for XP update.' }, { status: 500 });
    }

    const newXp = (profile.xp || 0) + xpReward;
    const newWeeklyXp = (profile.weekly_xp || 0) + xpReward;

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ xp: newXp, weekly_xp: newWeeklyXp })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user XP:', updateProfileError);
      // In a real application, you might want to 'rollback' the challenge completion here
      // For now, we'll just report the profile update failure.
      return NextResponse.json({ success: false, message: 'Challenge completed, but failed to update XP.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Challenge completed and XP awarded!' });

  } catch (error) {
    console.error('Unexpected error during challenge completion:', error);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
