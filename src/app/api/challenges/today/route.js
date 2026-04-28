import { NextResponse } from 'next/server';
import { getTodayChallenge } from '@/lib/challenges';

export async function GET() {
  try {
    const challenge = await getTodayChallenge();

    if (challenge) {
      return NextResponse.json({ success: true, challenge }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'No challenge found for today.' }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error fetching today\'s challenge:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
