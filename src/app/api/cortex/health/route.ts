import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check presence of common provider env vars and DB env
    const providers = {
      cloudflare: !!process.env.CLOUDFLARE_API_TOKEN || !!process.env.CLOUDFLARE_API_2,
      gemini: !!process.env.GEMINI_API_KEY || !!process.env.GEMINI_API_KEY_2 || !!process.env.GEMINI_API_KEY_3,
      openai: !!process.env.OPENAI_API_KEY,
    };

    const supabase = {
      configured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const health = {
      ok: Object.values(providers).some(Boolean),
      providers,
      supabase,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(health);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
