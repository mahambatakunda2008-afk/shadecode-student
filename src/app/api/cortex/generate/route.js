import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateAndStoreInsight } from '@/lib/cortex/insights';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Ensure environment variables are set during development/build
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set.');
  // In a real application, you might want to throw an error or handle this more robustly.
  // For now, allow it to proceed, but operations requiring Supabase will fail.
}

export async function POST(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase environment variables not configured.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get user session from Supabase to determine userId
  // Using the anon key is sufficient here as RLS should protect data access.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required. No active user session found.' }, { status: 401 });
  }

  const userId = user.id;

  const insight = await generateAndStoreInsight(userId, supabase);

  if (!insight) {
    return NextResponse.json({ error: 'Failed to generate or store insight. Check server logs.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, insight }, { status: 200 });
}
