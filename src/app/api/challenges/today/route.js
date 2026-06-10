import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function daysUntil(date) {
  const target = new Date(date);
  const now = new Date();

  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function generateChallenge({
  subjects = [],
  tasks = [],
  exams = [],
}) {
  const upcomingExam = exams.find((exam) => {
    const date = exam.exam_date || exam.date;
    if (!date) return false;

    const days = daysUntil(date);
    return days >= 0 && days <= 7;
  });

  if (upcomingExam) {
    return {
      title: "Exam Sprint",
      description: `Revise ${upcomingExam.subject || "your upcoming subject"} for 20 minutes.`,
      xp_reward: 75,
      difficulty: "medium",
      reason: "exam_priority",
      explanation:
        "Cortex detected an exam approaching soon and prioritised revision."
    };
  }

  const overdueTask = tasks.find((task) => {
    if (task.completed) return false;
    if (!task.due_date) return false;

    return new Date(task.due_date) < new Date();
  });

  if (overdueTask) {
    return {
      title: "Task Recovery",
      description: `Complete: ${overdueTask.title}`,
      xp_reward: 60,
      difficulty: "medium",
      reason: "overdue_task",
      explanation:
        "You have overdue work that Cortex believes should be cleared first."
    };
  }

  if (subjects.length) {
    const weakestSubject = [...subjects].sort(
      (a, b) =>
        (a.activity_count || 0) -
        (b.activity_count || 0)
    )[0];

    return {
      title: "Strengthen Weakness",
      description: `Study ${weakestSubject.name || "this subject"} for 15 minutes.`,
      xp_reward: 50,
      difficulty: "easy",
      reason: "weak_subject",
      explanation:
        `${weakestSubject.name || "This subject"} has received less attention recently.`
    };
  }

  return {
    title: "Momentum Builder",
    description: "Complete one focused study session today.",
    xp_reward: 40,
    difficulty: "easy",
    reason: "fallback",
    explanation:
      "No strong learning signal was detected today."
  };
}

export async function GET() {
  try {
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

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return Response.json({
        challenge: {
          id: existing.id,
          ...existing.challenge,
        },
        completed: existing.completed,
      });
    }

    const [{ data: subjects }, { data: tasks }, { data: exams }] =
      await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("exams").select("*"),
      ]);

    const challenge = generateChallenge({
      subjects: subjects || [],
      tasks: tasks || [],
      exams: exams || [],
    });

    const { data, error } = await supabase
      .from("daily_challenges")
      .insert({
        user_id: userId,
        date: today,
        challenge,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      challenge: {
        id: data.id,
        ...challenge,
      },
      completed: false,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: "Failed to fetch challenge",
      },
      {
        status: 500,
      }
    );
  }
}