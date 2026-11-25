import { createServerClient } from "@/lib/supabaseClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function harareDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Harare",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysUntil(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${harareDate()}T00:00:00`);
  return Math.ceil((target - today) / 86_400_000);
}

function generateChallenge({ subjects = [], tasks = [], exams = [] }) {
  const upcomingExam = exams.find((exam) => {
    if (!exam.exam_date) return false;
    const days = daysUntil(exam.exam_date);
    return days >= 0 && days <= 7;
  });

  if (upcomingExam) {
    return {
      title: "Exam Sprint",
      description: `Revise ${upcomingExam.subject || "your upcoming subject"} for 20 minutes.`,
      xp_reward: 75,
      difficulty: "medium",
      reason: "exam_priority",
      explanation: "Cortex detected an exam approaching soon and prioritised revision.",
    };
  }

  const unfinishedTask = tasks.find((task) => !task.completed);
  if (unfinishedTask) {
    return {
      title: "Task Recovery",
      description: `Complete: ${unfinishedTask.title || "one outstanding task"}`,
      xp_reward: 60,
      difficulty: "medium",
      reason: "unfinished_task",
      explanation: "Clear one outstanding task to keep your study plan moving.",
    };
  }

  if (subjects.length) {
    const subject = subjects[0];
    return {
      title: "Strengthen Your Skills",
      description: `Study ${subject.name || "one of your subjects"} for 15 minutes.`,
      xp_reward: 50,
      difficulty: "easy",
      reason: "subject_focus",
      explanation: "A short, focused session builds durable learning momentum.",
    };
  }

  return {
    title: "Momentum Builder",
    description: "Complete one focused study session today.",
    xp_reward: 40,
    difficulty: "easy",
    reason: "fallback",
    explanation: "Start with one focused session and build from there.",
  };
}

export async function GET() {
  try {
    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient();
    const today = harareDate();
    const { data: existing, error: existingError } = await supabase
      .from("daily_challenge_assignments")
      .select("id, challenge, completed_at")
      .eq("user_id", user.id)
      .eq("challenge_date", today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return Response.json({
        challenge: { id: existing.id, ...existing.challenge },
        completed: Boolean(existing.completed_at),
      });
    }

    const [
      { data: subjects, error: subjectsError },
      { data: tasks, error: tasksError },
      { data: exams, error: examsError },
    ] = await Promise.all([
      supabase.from("subjects").select("name").eq("user_id", user.id).limit(20),
      supabase.from("tasks").select("title, completed").eq("user_id", user.id).eq("completed", false).limit(20),
      supabase.from("exams").select("subject, exam_date").eq("user_id", user.id).gte("exam_date", today).order("exam_date", { ascending: true }).limit(10),
    ]);

    if (subjectsError) throw subjectsError;
    if (tasksError) throw tasksError;
    if (examsError) throw examsError;

    const challenge = generateChallenge({
      subjects: subjects || [],
      tasks: tasks || [],
      exams: exams || [],
    });

    const { data: inserted, error: insertError } = await supabase
      .from("daily_challenge_assignments")
      .insert({
        user_id: user.id,
        challenge_date: today,
        challenge,
      })
      .select("id, challenge, completed_at")
      .single();

    if (insertError?.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("daily_challenge_assignments")
        .select("id, challenge, completed_at")
        .eq("user_id", user.id)
        .eq("challenge_date", today)
        .single();
      if (racedError) throw racedError;
      return Response.json({
        challenge: { id: raced.id, ...raced.challenge },
        completed: Boolean(raced.completed_at),
      });
    }
    if (insertError) throw insertError;

    return Response.json({
      challenge: { id: inserted.id, ...inserted.challenge },
      completed: false,
    });
  } catch (err) {
    console.error("[daily-challenge] fetch failed:", err);
    return Response.json({ error: "Failed to fetch challenge" }, { status: 500 });
  }
}
