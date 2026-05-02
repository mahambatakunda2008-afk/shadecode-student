import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchUserActivitySummary, storeInsight } from '@/lib/cortex';

export async function POST(req) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Create a Supabase client with the service role key for engine-level operations.
  // This allows bypassing RLS policies to fetch user data and insert insights for any user.
  const supabaseServiceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // IMPORTANT: Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables
    {
      auth: { persistSession: false }, // No session needed for service role key
    }
  );

  try {
    // Step 1: Fetch user activity summary using Cortex service function, passing the service role client.
    const activitySummary = await fetchUserActivitySummary(userId, supabaseServiceRole);

    if (activitySummary.error) {
      return NextResponse.json({ error: activitySummary.error }, { status: 500 });
    }

    // Step 2: Simulate insight generation.
    // In a production setup, the actual Cortex Engine (this autonomous agent) would analyze
    // 'activitySummary' and generate a rich insight here using Gemini or similar.
    let insightText;
    if (activitySummary.completedTasksCount > 0) {
      insightText = `It looks like you've completed ${activitySummary.completedTasksCount} tasks recently. Keep up the great work!`;
    } else {
      insightText = `You haven't completed any tasks recently. Perhaps it's a good time to pick a new challenge!`;
    }

    // Step 3: Store the generated insight using Cortex service function, passing the service role client.
    const storedInsight = await storeInsight(userId, insightText, supabaseServiceRole);

    if (storedInsight.error) {
      return NextResponse.json({ error: storedInsight.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Insight generated and stored successfully', insight: storedInsight }, { status: 200 });

  } catch (error) {
    console.error('Error in insight generation API:', error);
    return NextResponse.json({ error: 'Failed to generate or store insight.' }, { status: 500 });
  }
}
