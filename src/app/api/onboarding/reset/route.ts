import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      console.error("[onboarding] reset error:", error);
      return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
    }

    // Clear the edge-readable flag so guards route the user back into /onboarding.
    const jar = await cookies();
    jar.delete("onboarding_complete");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding] reset unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
