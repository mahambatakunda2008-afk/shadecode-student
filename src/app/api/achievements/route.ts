import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAchievements, getUserAchievements, checkAndUnlockAchievements } from "@/lib/cortex/achievements";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allAchievements = await getAchievements();
    const userAchievements = await getUserAchievements(user.id);
    const unlockedIds = new Set(userAchievements.map((a) => a.id));

    const merged = allAchievements.map((a) => {
      const unlocked = userAchievements.find((ua) => ua.id === a.id);
      return {
        ...a,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt ?? null,
        seen: unlocked?.seen ?? false,
      };
    });

    return NextResponse.json({
      achievements: merged,
      totalUnlocked: userAchievements.length,
      totalAchievements: allAchievements.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load achievements" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newlyUnlocked = await checkAndUnlockAchievements(user.id);

    return NextResponse.json({ newAchievements: newlyUnlocked });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check achievements" },
      { status: 500 }
    );
  }
}
