import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Define all possible badges. In a larger application, this might come from a DB or config file.
const ALL_POSSIBLE_BADGES = [
  { id: 'first_task', title: 'First Task Completed', description: 'You completed your first task!' },
  { id: 'five_tasks', title: 'Five Tasks Completed', description: 'Completed 5 tasks.' },
  { id: 'first_subject', title: 'First Subject Created', description: 'Created your first study subject.' },
  { id: 'streak_3', title: '3-Day Streak', description: 'Studied for 3 consecutive days.' },
  { id: 'marathon_learner', title: 'Marathon Learner', description: 'Studied for 1 hour straight.' },
  { id: 'early_bird', title: 'Early Bird', description: 'Started studying before 8 AM.' },
  { id: 'night_owl', title: 'Night Owl', description: 'Studied after 10 PM.' },
  { id: 'level_5', title: 'Level 5 Achieved', description: 'Reached student level 5.' },
  { id: 'cortex_first', title: 'First Insight', description: 'Received your first insight from Cortex.' },
  { id: 'exam_pass', title: 'Exam Ace', description: 'Passed an exam.' },
  // Add more badges as the platform evolves
];

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = session.user.id;

  try {
    const { data: userAchievements, error } = await supabase
      .from('achievements')
      .select('title, unlocked_at')
      .eq('user_id', user_id);

    if (error) {
      console.error("Error fetching user achievements:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const badgesWithStatus = ALL_POSSIBLE_BADGES.map(possibleBadge => {
      const userAchievement = userAchievements.find(ua => ua.title === possibleBadge.title);
      return {
        ...possibleBadge,
        unlocked: !!userAchievement,
        unlocked_at: userAchievement ? userAchievement.unlocked_at : null,
      };
    });

    return NextResponse.json({ badges: badgesWithStatus });

  } catch (err) {
    console.error("Unhandled error in achievements API:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
