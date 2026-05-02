import { storeInsight } from '@/lib/cortex/insights'; // Assuming alias for src is configured
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, insightText } = await request.json();

    if (!userId || !insightText) {
      return NextResponse.json({ error: 'User ID and insight text are required.' }, { status: 400 });
    }

    const { data, error } = await storeInsight(userId, insightText);

    if (error) {
      console.error("API Error storing insight:", error);
      return NextResponse.json({ error: 'Failed to store insight.', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Insight stored successfully.', data }, { status: 200 });

  } catch (error) {
    console.error("API Exception storing insight:", error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}