import { createServerClient } from "@/lib/supabaseClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const challengeId = body?.challengeId;
    if (typeof challengeId !== "string" || !UUID_PATTERN.test(challengeId)) {
      return Response.json({ error: "A valid challenge ID is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase.rpc("complete_daily_challenge", {
      p_assignment_id: challengeId,
      p_user_id: user.id,
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      already_completed: Boolean(result.already_completed),
      xp_awarded: result.xp_awarded || 0,
      challenge_completed: true,
    });
  } catch (err) {
    console.error("[daily-challenge] completion failed:", err);
    return Response.json({ error: "Failed to complete challenge" }, { status: 500 });
  }
}
