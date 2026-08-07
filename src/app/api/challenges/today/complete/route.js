import { createServerClient } from "@/lib/supabaseClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const challengeId = body?.challengeId;

    if (!challengeId) {
      return Response.json(
        {
          error: "Challenge ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // Get authenticated user from session cookie
    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { data: challengeRow, error: fetchError } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !challengeRow) {
      return Response.json(
        {
          error: "Challenge not found",
        },
        {
          status: 404,
        }
      );
    }

    // Prevent XP farming
    if (challengeRow.completed) {
      return Response.json({
        success: true,
        already_completed: true,
        xp_awarded: 0,
      });
    }

    const xpReward =
      challengeRow?.challenge?.xp_reward || 50;

    const { error: updateError } = await supabase
      .from("daily_challenges")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    // XP logging
    try {
      await supabase.from("xp").insert({
        user_id: userId,
        amount: xpReward,
        source: "daily_challenge",
        challenge_id: challengeId,
        created_at: new Date().toISOString(),
      });
    } catch (xpError) {
      console.error(
        "XP award failed but challenge completed:",
        xpError
      );
    }

    return Response.json({
      success: true,
      xp_awarded: xpReward,
      challenge_completed: true,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: "Failed to complete challenge",
      },
      {
        status: 500,
      }
    );
  }
}