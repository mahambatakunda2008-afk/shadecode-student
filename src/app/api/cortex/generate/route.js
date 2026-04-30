import { NextResponse } from 'next/server';
import { generateInsight } from '@/lib/cortex';

export async function POST(request) {
  try {
    const { user_id, subject_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required to generate an insight.' }, { status: 400 });
    }

    const insight = await generateInsight(user_id, subject_id);

    if (!insight) {
      return NextResponse.json({ error: 'Failed to generate insight.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    console.error('API Error generating insight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}