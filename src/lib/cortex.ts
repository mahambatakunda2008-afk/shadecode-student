import { createServerClient } from "@/lib/supabaseClient";
import type {
  CortexEventInput,
  CortexSnapshot,
} from "@/types";

/* ─────────────────────────────────────────────
   CORE EVENT EMITTER
   (FIX: REQUIRED BY /exam/mark ROUTE)
───────────────────────────────────────────── */

export async function emitCortexEvent(event: CortexEventInput) {
  const supabase = createServerClient();

  try {
    const { error } = await supabase.from("cortex_events").insert({
      user_id: event.userId,
      type: event.type,
      source: event.source,
      data: event.data ?? {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Cortex event insert failed:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Cortex event exception:", err);
    return false;
  }
}

/* ─────────────────────────────────────────────
   EXAM → CORTEX INTELLIGENCE UPDATE
───────────────────────────────────────────── */

export async function updateCortexFromExam(params: {
  userId: string;
  subject: string;
  percentage: number;
  weakAreas: string[];
  strongAreas: string[];
}) {
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.userId)
    .single();

  if (!profile) return null;

  const currentXp = profile.xp ?? 0;
  const currentLevel = profile.level ?? 1;

  const xpGain = Math.round(params.percentage * 0.5);
  const newXp = currentXp + xpGain;
  const newLevel = Math.floor(newXp / 100) + 1;

  /* ─────────────────────────────────────────────
     SNAPSHOT BUILD (CORTEX MEMORY STATE)
  ───────────────────────────────────────────── */

  const snapshot: CortexSnapshot = {
    streak: profile.streak ?? 0,
    level: newLevel,
    xp: newXp,

    totalTasks: profile.total_tasks ?? 0,
    completedTasks: profile.completed_tasks ?? 0,
    pendingTasks: profile.pending_tasks ?? 0,

    subjects: profile.subjects ?? [],
    recentTaskTitles: profile.recent_task_titles ?? [],

    weakestSubjects: params.weakAreas,
    strongestSubjects: params.strongAreas,

    lastExamScore: params.percentage,
    lastExamSubject: params.subject,
    lastExamWeakAreas: params.weakAreas,
    lastExamStrongAreas: params.strongAreas,
  };

  /* ─────────────────────────────────────────────
     SAVE PROFILE UPDATE
  ───────────────────────────────────────────── */

  const { error } = await supabase
    .from("profiles")
    .update({
      xp: newXp,
      level: newLevel,
      snapshot,
    })
    .eq("id", params.userId);

  if (error) {
    console.error("Profile update failed:", error);
    return null;
  }

  /* ─────────────────────────────────────────────
     EMIT EXAM EVENT (CORTEX MEMORY LOG)
  ───────────────────────────────────────────── */

  await emitCortexEvent({
    userId: params.userId,
    type: "exam.completed",
    source: "exam",
    data: {
      subject: params.subject,
      percentage: params.percentage,
      xpGain,
    },
  });

  return snapshot;
}
