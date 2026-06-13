"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getStudentIntelligence } from "@/lib/student-intelligence";
import { CircularProgress } from "./CircularProgress";

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
  const [intelligence, setIntelligence] = useState<StudentIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAssessments, setUpcomingAssessments] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const [intelligenceData, tasksData] = await Promise.all([
          getStudentIntelligence(user.id),
          supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .not("due_date", "is", null)
            .gte("due_date", new Date().toISOString().split("T")[0])
            .order("due_date", { ascending: true })
            .limit(5),
        ]);

        if (intelligenceData) {
          setIntelligence(intelligenceData as any);
        } else {
          setError("Failed to load intelligence data");
        }

        if (tasksData?.data) {
          setUpcomingAssessments(tasksData.data);
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !intelligence) {
    return (
      <div style={{ padding: "32px 24px" }}>
        <p style={{ color: "var(--muted-foreground)" }}>Error loading dashboard: {error}</p>
      </div>
    );
  }

  const { progress, performance, activity, intelligence: intel } = intelligence;
  const topRecommendation = intel.recommendations[0];
  const topWeakArea = intel.weakAreas[0];
  const topInsight = intel.insights[0];

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "4px" }}>
          Welcome back
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0 }}>
          What should I do next?
        </h1>
      </div>

      {/* Primary Action Card */}
      {topRecommendation && (
        <PrimaryActionCard recommendation={topRecommendation} router={router} />
      )}

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <StatCard
          label="Study Streak"
          value={`${activity.streak.currentStreak} days`}
          icon="🔥"
          color="#fb923c"
        />
        <StatCard
          label="Overall Progress"
          value={`${progress.overallCompletion}%`}
          icon="📊"
          color="#6366f1"
        />
        <StatCard
          label="Average Score"
          value={`${Math.round(performance.trends.averageScore)}%`}
          icon="📈"
          color="#22c55e"
        />
        <StatCard
          label="Weak Areas"
          value={intel.weakAreas.length}
          icon="⚠️"
          color="#f59e0b"
        />
      </div>

      {/* Exam Readiness Score */}
      {intelligence.examReadiness && (
        <SectionCard
          title="Exam Readiness"
          icon="🎯"
          content={
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <CircularProgress
                value={intelligence.examReadiness.overallScore}
                max={100}
                size={80}
                color={intelligence.examReadiness.overallScore >= 70 ? "#22c55e" : intelligence.examReadiness.overallScore >= 50 ? "#f59e0b" : "#ef4444"}
                label={`${Math.round(intelligence.examReadiness.overallScore)}%`}
                sublabel="ready"
              />
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {intelligence.examReadiness.readinessLevel}
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
                  Predicted Grade: {intelligence.examReadiness.predictedGrade}
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  {intelligence.examReadiness.timeToExam} days to exam
                </p>
              </div>
            </div>
          }
        />
      )}

      {/* Secondary Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        {/* Recommended Lesson */}
        {progress.curriculum.recommendedNextLesson && (
          <SectionCard
            title="Recommended Lesson"
            icon="📖"
            content={
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {progress.curriculum.recommendedNextLesson.title}
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  Continue with this lesson to make progress
                </p>
              </div>
            }
            actionLabel="Start Lesson"
            onAction={() => router.push(`/learn/${progress.curriculum.recommendedNextLesson.id}`)}
          />
        )}

        {/* Weakest Topic */}
        {topWeakArea && (
          <SectionCard
            title="Weakest Topic"
            icon="🎯"
            content={
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {topWeakArea.topic}
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  Severity: {topWeakArea.severity} · Score: {topWeakArea.score}%
                </p>
              </div>
            }
            actionLabel="Start Revision"
            onAction={() => router.push("/learn")}
          />
        )}

        {/* Cortex Insight */}
        {topInsight && (
          <SectionCard
            title="Cortex Insight"
            icon="🔮"
            content={
              <div>
                <p style={{ fontSize: "14px", lineHeight: 1.5 }}>
                  {topInsight.content}
                </p>
              </div>
            }
            actionLabel="View Insights"
            onAction={() => router.push("/insights")}
          />
        )}
      </div>

      {/* All Recommendations */}
      {intel.recommendations.length > 1 && (
        <SectionCard
          title="Today's Study Plan"
          icon="📋"
          content={
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {intel.recommendations.slice(1, 5).map((rec, index) => (
                <div
                  key={rec.id || index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "var(--muted)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{getPriorityIcon(rec.priority)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                      {rec.title}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
                      {rec.description}
                    </p>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {rec.estimatedTime}m
                  </span>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* Upcoming Assessments */}
      {upcomingAssessments.length > 0 && (
        <SectionCard
          title="Upcoming Assessments"
          icon="📅"
          content={
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {upcomingAssessments.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "var(--muted)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{task.completed ? "✅" : "⏰"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                      {task.title || "Untitled Task"}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No date"}
                </p>
                  </div>
                </div>
              ))}
            </div>
          }
          actionLabel="View All Tasks"
          onAction={() => router.push("/tasks")}
        />
      )}
    </div>
  );
}

function PrimaryActionCard({ recommendation, router }: { recommendation: any; router: any }) {
  const priorityColor = {
    critical: "#ef4444",
    high: "#f59e0b",
    medium: "#6366f1",
    low: "#94a3b8",
  }[recommendation.priority] || "#6366f1";

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${priorityColor}15, ${priorityColor}05)`,
        border: `1px solid ${priorityColor}30`,
        borderRadius: "16px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-50%",
          width: "200%",
          height: "200%",
          background: `radial-gradient(circle, ${priorityColor}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>✨</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: priorityColor,
            }}
          >
            {recommendation.priority} Priority
          </span>
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px 0" }}>
          {recommendation.title}
        </h2>
        <p style={{ fontSize: "15px", color: "var(--muted-foreground)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
          {recommendation.description}
        </p>
        <button
          onClick={() => router.push("/learn")}
          style={{
            background: priorityColor,
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: `0 0 12px ${priorityColor}40`,
          }}
        >
          {recommendation.action} →
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize: "28px", fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
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
  icon: string;
  content: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", margin: 0 }}>
          {title}
        </p>
      </div>
      <div style={{ marginBottom: actionLabel ? "12px" : 0 }}>{content}</div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

function getPriorityIcon(priority: string): string {
  const icons = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "⚪",
  };
  return icons[priority as keyof typeof icons] || "⚪";
}

function DashboardSkeleton() {
  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div style={{ height: "13px", width: "80px", background: "var(--muted)", borderRadius: "4px", marginBottom: "8px" }} />
        <div style={{ height: "32px", width: "200px", background: "var(--muted)", borderRadius: "8px" }} />
      </div>
      <div style={{ height: "120px", background: "var(--muted)", borderRadius: "16px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: "100px", background: "var(--muted)", borderRadius: "12px" }} />
        ))}
      </div>
    </div>
  );
}
