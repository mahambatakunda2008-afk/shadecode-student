"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  LineChart,
  Loader2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentIntelligence } from "@/lib/student-intelligence";

interface StudentIntelligenceData {
  progress: {
    overallCompletion: number;
    curriculum: {
      currentLesson: { id: string; title: string } | null;
      recommendedNextLesson: { id: string; title: string } | null;
    };
  };
  performance: {
    trends: {
      averageScore: number;
    };
  };
  activity: {
    streak: {
      currentStreak: number;
    };
  };
  intelligence: {
    recommendations: any[];
    weakAreas: any[];
    insights: any[];
  };
  examReadiness?: {
    overallScore: number;
    readinessLevel: string;
    predictedGrade: string;
    timeToExam: number;
  };
}

export default function NextActionDashboard() {
  const [intelligence, setIntelligence] =
    useState<StudentIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAssessments, setUpcomingAssessments] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        const [intelligenceData, examsData] = await Promise.all([
          getStudentIntelligence(user.id),
          // Was querying tasks.due_date, which doesn't exist on the tasks
          // table at all -- Supabase returned {data: null, error} for
          // every call, silently, so "Upcoming assessments" always
          // rendered its empty state regardless of what a student
          // actually had coming up. exams.exam_date is the real,
          // existing date field this section actually needs.
          supabase
            .from("exams")
            .select("id, subject, exam_date")
            .eq("user_id", user.id)
            .gte("exam_date", new Date().toISOString().split("T")[0])
            .order("exam_date", { ascending: true })
            .limit(5),
        ]);

        if (intelligenceData) {
          setIntelligence(intelligenceData as any);
        } else {
          setError("Failed to load intelligence data");
        }

        if (examsData?.data) {
          setUpcomingAssessments(
            examsData.data.map((exam) => ({
              id: exam.id,
              title: exam.subject,
              due_date: exam.exam_date,
              completed: false,
            }))
          );
        }
      } catch (err) {
        console.error("[NextActionDashboard] Error:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  if (loading) return <DashboardSkeleton />;

  if (error || !intelligence) {
    return (
      <div className="ssc-page">
        <div className="ssc-card flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-2xl">Dashboard unavailable</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {error ?? "We could not load your learning intelligence."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { progress, performance, activity, intelligence: intel } = intelligence;
  const topRecommendation = intel.recommendations[0];
  const topWeakArea = intel.weakAreas[0];
  const topInsight = intel.insights[0];

  return (
    <div className="ssc-page-full dashboard-main">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="ssc-page-header">
          <div>
            <p className="ssc-kicker">AI learning OS</p>
            <h1>What should I do next?</h1>
            <p className="ssc-subtitle">
              Your dashboard prioritizes the next action that will move your
              score, consistency, and exam readiness forward.
            </p>
          </div>
          <div className="ssc-card hidden items-center gap-3 px-4 py-3 md:flex">
            <BrainCircuit size={20} className="text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Cortex is active</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Recommendations refresh with your progress.
              </p>
            </div>
          </div>
        </section>

        {topRecommendation ? (
          <PrimaryActionCard
            recommendation={topRecommendation}
            onAction={() => router.push("/learn")}
          />
        ) : (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="You are caught up"
            description="No urgent recommendations right now. Keep learning or review your progress."
            actionLabel="Browse lessons"
            onAction={() => router.push("/learn")}
          />
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Study streak"
            value={`${activity.streak.currentStreak} days`}
            icon={<Flame size={20} />}
            tone="warning"
          />
          <StatCard
            label="Overall progress"
            value={`${progress.overallCompletion}%`}
            icon={<BarChart3 size={20} />}
            tone="primary"
          />
          <StatCard
            label="Average score"
            value={`${Math.round(performance.trends.averageScore)}%`}
            icon={<LineChart size={20} />}
            tone="accent"
          />
          <StatCard
            label="Weak areas"
            value={intel.weakAreas.length.toString()}
            icon={<AlertTriangle size={20} />}
            tone="danger"
          />
        </section>

        {/* Exam Readiness card intentionally removed: every field it showed
            was either hardcoded (readinessLevel always "Intermediate",
            predictedGrade always "B", timeToExam always 30) or permanently
            zero (overallScore -- its data source, getExamPerformance(), is
            an unimplemented "exam results table" stub that always returns
            an empty array). Showing fabricated data as a real, personalized
            prediction is worse than showing nothing. Re-add once
            student-intelligence/services/performance.ts actually reads
            real exam data and a real grade-prediction calculation exists. */}

        <section
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {progress.curriculum.recommendedNextLesson && (
            <SectionCard
              title="Recommended lesson"
              icon={<BookOpenCheck size={18} />}
              content={
                <div>
                  <h3>{progress.curriculum.recommendedNextLesson.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Continue with this lesson to make progress.
                  </p>
                </div>
              }
              actionLabel="Start lesson"
              onAction={() =>
                router.push(
                  `/learn/${progress.curriculum.recommendedNextLesson?.id}`
                )
              }
            />
          )}

          {topWeakArea && (
            <SectionCard
              title="Weakest topic"
              icon={<Target size={18} />}
              content={
                <div>
                  <h3>{topWeakArea.topic}</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Severity: {topWeakArea.severity} · Score:{" "}
                    {topWeakArea.score}%
                  </p>
                </div>
              }
              actionLabel="Start revision"
              onAction={() => router.push("/learn")}
            />
          )}

          {topInsight && (
            <SectionCard
              title="Cortex insight"
              icon={<BrainCircuit size={18} />}
              content={
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  {topInsight.content}
                </p>
              }
              actionLabel="View insights"
              onAction={() => router.push("/insights/history")}
            />
          )}
        </section>

        <section
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
        >
          {intel.recommendations.length > 1 && (
            <SectionCard
              title="Today's study plan"
              icon={<ClipboardList size={18} />}
              content={
                <div className="grid gap-2">
                  {intel.recommendations.slice(1, 5).map((rec, index) => (
                    <PlanRow key={rec.id || index} recommendation={rec} />
                  ))}
                </div>
              }
            />
          )}

          {upcomingAssessments.length > 0 ? (
            <SectionCard
              title="Upcoming assessments"
              icon={<CalendarClock size={18} />}
              content={
                <div className="grid gap-2">
                  {upcomingAssessments.slice(0, 3).map((task) => (
                    <AssessmentRow key={task.id} task={task} />
                  ))}
                </div>
              }
              actionLabel="View all tasks"
              onAction={() => router.push("/tasks")}
            />
          ) : (
            <EmptyState
              icon={<Trophy size={24} />}
              title="No upcoming assessments"
              description="Your schedule is clear. Add tasks when you get new deadlines."
              actionLabel="Open tasks"
              onAction={() => router.push("/tasks")}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PrimaryActionCard({
  recommendation,
  onAction,
}: {
  recommendation: any;
  onAction: () => void;
}) {
  const tone = priorityTone(recommendation.priority);

  return (
    <section className="ssc-card-interactive relative overflow-hidden p-6 md:p-7">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: tone.color }}
      />
      <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-2xl"
              style={{
                background: tone.soft,
                color: tone.color,
              }}
            >
              <Sparkles size={19} />
            </span>
            <span className="ssc-label" style={{ color: tone.color }}>
              {recommendation.priority} priority
            </span>
          </div>
          <h2 className="max-w-3xl text-2xl md:text-3xl">
            {recommendation.title}
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--muted-foreground)]">
            {recommendation.description}
          </p>
        </div>
        <button onClick={onAction} className="ssc-button w-full md:w-auto">
          {recommendation.action ?? "Start"}
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "primary" | "accent" | "warning" | "danger";
}) {
  const styles = {
    primary: ["var(--primary-glow)", "var(--primary)"],
    accent: ["var(--accent-soft)", "var(--accent)"],
    warning: ["var(--warning-soft)", "var(--warning)"],
    danger: ["var(--danger-soft)", "var(--danger)"],
  }[tone];

  return (
    <div className="ssc-card-interactive p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="ssc-label">{label}</p>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: styles[0], color: styles[1] }}
        >
          {icon}
        </span>
      </div>
      <p className="text-3xl font-black leading-none" style={{ color: styles[1] }}>
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  content,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: ReactNode;
  content: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ssc-card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
          {icon}
        </span>
        <p className="ssc-label">{title}</p>
      </div>
      <div className="flex-1">{content}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="ssc-button ssc-button-secondary w-full">
          {actionLabel}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="ssc-card flex flex-col items-start gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </span>
      <div>
        <h3>{title}</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
      <button onClick={onAction} className="ssc-button ssc-button-secondary">
        {actionLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function PlanRow({ recommendation }: { recommendation: any }) {
  const tone = priorityTone(recommendation.priority);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: tone.soft, color: tone.color }}
      >
        {tone.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{recommendation.title}</p>
        <p className="truncate text-xs text-[var(--muted-foreground)]">
          {recommendation.description}
        </p>
      </div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">
        {recommendation.estimatedTime}m
      </span>
    </div>
  );
}

function AssessmentRow({ task }: { task: any }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]">
        {task.completed ? <CheckCircle2 size={18} /> : <CalendarClock size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {task.title || "Untitled task"}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {task.due_date
            ? new Date(task.due_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "No date"}
        </p>
      </div>
    </div>
  );
}

function priorityTone(priority: string) {
  const tones = {
    critical: {
      color: "var(--danger)",
      soft: "var(--danger-soft)",
      icon: <AlertTriangle size={18} />,
    },
    high: {
      color: "var(--warning)",
      soft: "var(--warning-soft)",
      icon: <Target size={18} />,
    },
    medium: {
      color: "var(--primary)",
      soft: "var(--primary-glow)",
      icon: <Sparkles size={18} />,
    },
    low: {
      color: "var(--muted-foreground)",
      soft: "var(--surface-2)",
      icon: <CheckCircle2 size={18} />,
    },
  };

  return tones[priority as keyof typeof tones] ?? tones.low;
}

function DashboardSkeleton() {
  return (
    <div className="ssc-page-full dashboard-main">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <div className="ssc-skeleton mb-3 h-3 w-32" />
          <div className="ssc-skeleton h-10 w-80 max-w-full" />
          <div className="ssc-skeleton mt-3 h-4 w-[520px] max-w-full" />
        </div>
        <div className="ssc-skeleton h-44 w-full rounded-[var(--radius-lg)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ssc-skeleton h-32 rounded-[var(--radius-lg)]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ssc-skeleton h-40 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
