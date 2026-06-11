import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listInsights, createInsight } from "@/lib/cortex/runtime/insights";

/**
 * GET /api/cortex/insight
 * Returns the authenticated user's Cortex insights (newest first).
 * Consumed by the insights history page.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await listInsights(user.id);
    return NextResponse.json(insights);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load insights" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cortex/insight
 * Persists a single insight for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const text = typeof body?.insight === "string" ? body.insight : "";

    if (!text.trim()) {
      return NextResponse.json({ error: "insight is required" }, { status: 400 });
    }

    const created = await createInsight(user.id, text);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create insight" },
      { status: 500 }
    );
  }
}
