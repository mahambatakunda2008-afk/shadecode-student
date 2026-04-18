import { createClient } from "@/lib/supabase/client";

export async function updateStreak(userId: string) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak, last_active")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const today = new Date().toISOString().split("T")[0];
  const lastActive = profile.last_active;

  if (lastActive === today) return; // Already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = profile.streak;

  if (lastActive === yesterdayStr) {
    // Consecutive day — increment streak
    newStreak = profile.streak + 1;
  } else if (lastActive !== today) {
    // Missed a day — reset streak
    newStreak = 1;
  }

  await supabase
    .from("profiles")
    .update({ streak: newStreak, last_active: today })
    .eq("id", userId);

  // Streak achievements
  if (newStreak === 3) {
    await supabase.from("achievements").insert({
      user_id: userId,
      title: "3 Day Streak 🔥",
    });
  }
  if (newStreak === 7) {
    await supabase.from("achievements").insert({
      user_id: userId,
      title: "7 Day Streak ⚡",
    });
  }
  if (newStreak === 30) {
    await supabase.from("achievements").insert({
      user_id: userId,
      title: "30 Day Streak 🏆",
    });
  }
}