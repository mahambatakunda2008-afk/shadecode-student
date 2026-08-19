import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * POST /api/user/complete-tour
 * Marks the onboarding tour as completed for a given user.
 * Expected payload: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId missing' }, { status: 400 });
    }
    // TODO: integrate with your persistence layer (e.g., Supabase) to record completion.
    // For now, respond with success.
    return NextResponse.json({ success: true, userId }, { status: 200 });
  } catch (error) {
    console.error('[complete-tour] error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export const config = {
  // This route should be accessible via POST only.
  methods: ['POST'],
};
