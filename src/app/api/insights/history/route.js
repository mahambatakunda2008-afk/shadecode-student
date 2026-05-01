import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Used for server-side auth checks
import { fetchInsightsByUserId } from '@/lib/supabase/insights';

// Initialize Supabase client for server-side operations, specifically for auth context.
// For production, ensure this client is configured securely, potentially using a service role key
// or proper JWT/cookie handling as per Next.js/Supabase best practices.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req) {
    let userId = null;

    // Attempt to retrieve the user's ID from the authenticated session.
    // In a production setup without `@supabase/auth-helpers-nextjs`,
    // you would typically parse a JWT from the 'Authorization' header.
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError) {
                console.error('Authentication error getting user from token:', authError);
                return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
            }
            if (user) {
                userId = user.id;
            }
        }
    } catch (e) {
        console.error('Error processing authentication token:', e);
        // Continue to fallback if token processing fails
    }

    // Fallback for development/testing if no authenticated user ID is found.
    // In a production application, requests without proper authentication should return 401.
    if (!userId) {
        console.warn("No authenticated user ID found. Using placeholder for development. Implement proper authentication for production.");
        // For local development, allow a 'userId' query parameter.
        const { searchParams } = new URL(req.url);
        userId = searchParams.get('userId') || '00000000-0000-0000-0000-000000000001'; // Placeholder ID
        // For production, uncomment the line below and remove placeholder logic:
        // return NextResponse.json({ error: 'Unauthorized: No valid user session found.' }, { status: 401 });
    }

    const { data: insights, error } = await fetchInsightsByUserId(userId);

    if (error) {
        console.error('API Error: Failed to fetch insight history:', error);
        return NextResponse.json({ error: `Failed to retrieve insights history: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(insights, { status: 200 });
}
