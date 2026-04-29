import { NextResponse } from 'next/server';
import { getTodayChallenge } from '@/lib/challenges'; // Assuming @/lib resolves to src/lib

/**
 * GET handler for /api/challenges/today
 * Fetches today's daily challenge.
 * @returns {NextResponse} JSON response with the challenge or a message if none is found.
 */
export async function GET(request) {
  try {
    const challenge = await getTodayChallenge();

    if (!challenge) {
      return NextResponse.json({ message: 'No daily challenge for today.', challenge: null }, { status: 200 });
    }

    return NextResponse.json({ challenge }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/challenges/today API route:', error);
    // Return a generic error message to the client, log full details on the server
    return NextResponse.json({ error: 'Failed to fetch daily challenge.' }, { status: 500 });
  }
}
