import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export interface ExamResult {
  subject: string;
  percentage: number;
  results: {
    questionId: number;
    topic: string;
    score: number;
    correct: boolean;
  }[];
}

/* ─────────────────────────────────────────────────────────────
   MAIN ENTRY: CALL AFTER EXAM
───────────────────────────────────────────────────────────── */

export async function updateCortexFromExam(userId: string, exam: ExamResult) {
  if (!userId || !exam) return;

  await logLearningEvent(userId, exam);

  await updateTopicMastery(userId, exam);

  await updateCortexProfile(userId);
}

/* ─────────────────────────────────────────────────────────────
   1. LOG RAW EVENT
───────────────────────────────────────────────────────────── */

async function logLearningEvent(userId: string, exam: ExamResult) {
  await supabase.from("learning_events").insert({
    user_id: userId,
    type: "exam",
    subject: exam.subject,
    score: exam.percentage,
    metadata: exam,
  });
}

/* ─────────────────────────────────────────────────────────────
   2. UPDATE TOPIC MASTERY
───────────────────────────────────────────────────────────── */

async function updateTopicMastery(userId: string, exam: ExamResult) {
  for (const r of exam.results) {
    const { data } = await supabase
      .from("topic_mastery")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", exam.subject)
      .eq("topic", r.topic)
      .maybeSingle();

    const prev = data?.mastery_score ?? 50;

    const delta = r.correct ? 6 : -8;
    const newScore = clamp(prev + delta, 0, 100);

    await supabase.from("topic_mastery").upsert({
      user_id: userId,
      subject: exam.subject,
      topic: r.topic,
      mastery_score: newScore,
      last_score: r.score,
      attempts: (data?.attempts ?? 0) + 1,
      last_attempted: new Date().toISOString(),
      trend: newScore - prev,
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   3. UPDATE CORTEX PROFILE (GLOBAL VIEW)
───────────────────────────────────────────────────────────── */

async function updateCortexProfile(userId: string) {
  const { data: topics } = await supabase
    .from("topic_mastery")
    .select("*")
    .eq("user_id", userId);

  if (!topics?.length) return;

  const grouped: Record<string, number[]> = {};

  topics.forEach(t => {
    if (!grouped[t.subject]) grouped[t.subject] = [];
    grouped[t.subject].push(t.mastery_score);
  });

  let weakest = "";
  let strongest = "";
  let min = 100;
  let max = 0;

  Object.entries(grouped).forEach(([sub, scores]) => {
    const avg = avgArr(scores);

    if (avg < min) {
      min = avg;
      weakest = sub;
    }

    if (avg > max) {
      max = avg;
      strongest = sub;
    }
  });

  await supabase.from("user_cortex").upsert({
    user_id: userId,
    weakest_subject: weakest,
    strongest_subject: strongest,
    last_updated: new Date().toISOString(),
  });
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function avgArr(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
