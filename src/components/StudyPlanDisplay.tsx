"use client";

import { useState } from "react";
import { Calendar, Clock, Target, AlertTriangle, CheckCircle, TrendingUp, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { StudyPlan, StudySession, StudyProgress, CatchUpRecommendation, RevisionBlock } from "@/lib/studyPlan/types";
import { calculateStudyProgress } from "@/lib/studyPlan/generator";

interface StudyPlanDisplayProps {
  plan: StudyPlan;
  completedSessions?: StudySession[];
  onSessionComplete?: (sessionId: string) => void;
  onAdjustPlan?: () => void;
}

export default function StudyPlanDisplay({ plan, completedSessions = [], onSessionComplete, onAdjustPlan }: StudyPlanDisplayProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [showCatchUp, setShowCatchUp] = useState(false);

  const progress = calculateStudyProgress(plan, completedSessions);
  const currentWeek = getCurrentWeekNumber(plan);
  const currentWeekSchedule = plan.weeklySchedules.find(w => w.weekNumber === currentWeek);

  const toggleWeek = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
            Study Plan
          </p>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
            Target: {plan.goals.targetGrade}
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: 4 }}>
            Exam: {new Date(plan.goals.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
            {plan.weeklySchedules.length} weeks
          </p>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
            {plan.goals.availableHoursPerWeek}h/week
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <ProgressCard
          icon={<Target size={16} color="#6366f1" />}
          label="Sessions"
          value={`${progress.totalSessionsCompleted}/${progress.totalSessionsPlanned}`}
          color="#6366f1"
        />
        <ProgressCard
          icon={<Clock size={16} color="#22c55e" />}
          label="Study Time"
          value={`${Math.round(progress.totalCompletedMinutes / 60)}h`}
          color="#22c55e"
        />
        <ProgressCard
          icon={<TrendingUp size={16} color="#f59e0b" />}
          label="Streak"
          value={`${progress.streakDays} days`}
          color="#f59e0b"
        />
        <ProgressCard
          icon={<CheckCircle size={16} color={progress.onTrack ? "#22c55e" : "#ef4444"} />}
          label="On Track"
          value={progress.onTrack ? "Yes" : "No"}
          color={progress.onTrack ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Projected Grade */}
      {progress.projectedGrade && (
        <div style={{ padding: 12, borderRadius: 8, background: progress.projectedGrade === plan.goals.targetGrade ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${progress.projectedGrade === plan.goals.targetGrade ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}` }}>
          <p style={{ fontSize: "12px", fontWeight: 600, marginBottom: 4 }}>Projected Grade</p>
          <p style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
            {progress.projectedGrade}
            {progress.projectedGrade !== plan.goals.targetGrade && (
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 8 }}>
                (Target: {plan.goals.targetGrade})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Current Week */}
      {currentWeekSchedule && (
        <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color="#6366f1" />
            <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>This Week</p>
            <span style={{ padding: "2px 8px", borderRadius: "20px", background: "#6366f1", color: "white", fontSize: "11px", fontWeight: 600 }}>
              Week {currentWeek}
            </span>
          </div>
          <WeeklyScheduleView schedule={currentWeekSchedule} completedSessions={completedSessions} onSessionComplete={onSessionComplete} />
        </div>
      )}

      {/* Catch-up Recommendations */}
      {plan.catchUpRecommendations.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} color="#ef4444" />
              <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Catch-up Needed</p>
            </div>
            <span style={{ padding: "2px 8px", borderRadius: "20px", background: "#ef4444", color: "white", fontSize: "11px", fontWeight: 600 }}>
              {plan.catchUpRecommendations.length} items
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.catchUpRecommendations.slice(0, showCatchUp ? undefined : 3).map(rec => (
              <CatchUpCard key={rec.id} recommendation={rec} />
            ))}
            {plan.catchUpRecommendations.length > 3 && !showCatchUp && (
              <button
                onClick={() => setShowCatchUp(true)}
                style={{ padding: "8px", background: "transparent", border: "none", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                View all {plan.catchUpRecommendations.length} recommendations
              </button>
            )}
          </div>
        </div>
      )}

      {/* Revision Blocks */}
      {plan.revisionBlocks.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} color="#8b5cf6" />
            <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Revision Blocks</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plan.revisionBlocks.slice(0, 5).map(block => (
              <RevisionBlockCard key={block.id} block={block} />
            ))}
          </div>
        </div>
      )}

      {/* All Weeks */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Full Schedule</p>
          <button
            onClick={onAdjustPlan}
            style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--muted)", border: "1px solid var(--card-border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            Adjust Plan
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.weeklySchedules.map(schedule => (
            <WeekCard
              key={schedule.weekNumber}
              schedule={schedule}
              isCurrent={schedule.weekNumber === currentWeek}
              isExpanded={expandedWeeks.has(schedule.weekNumber)}
              onToggle={() => toggleWeek(schedule.weekNumber)}
              completedSessions={completedSessions}
              onSessionComplete={onSessionComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {icon}
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600, margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: "18px", fontWeight: 800, color, margin: 0 }}>{value}</p>
    </div>
  );
}

function WeeklyScheduleView({ schedule, completedSessions, onSessionComplete }: { schedule: any; completedSessions: StudySession[]; onSessionComplete?: (sessionId: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = schedule.sessions.filter((s: StudySession) => s.date.split('T')[0] === today);

  if (todaySessions.length === 0) {
    return (
      <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>
        No sessions scheduled for today
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {todaySessions.map((session: StudySession) => (
        <SessionCard
          key={session.id}
          session={session}
          isCompleted={completedSessions.some(c => c.id === session.id)}
          onComplete={() => onSessionComplete?.(session.id)}
        />
      ))}
    </div>
  );
}

function SessionCard({ session, isCompleted, onComplete }: { session: StudySession; isCompleted: boolean; onComplete?: () => void }) {
  const typeColors = {
    learn: "#6366f1",
    practice: "#22c55e",
    revision: "#f59e0b",
    exam: "#ef4444",
    catchup: "#8b5cf6",
  };

  const color = typeColors[session.type];

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: isCompleted ? "rgba(34,197,94,0.05)" : "var(--muted)",
        border: isCompleted ? "1px solid rgba(34,197,94,0.2)" : "1px solid var(--card-border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Clock size={18} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{session.subject}</p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "2px 0 0" }}>{session.topic}</p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color, margin: 0 }}>{session.durationMinutes}m</p>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0, textTransform: "capitalize" }}>{session.type}</p>
      </div>
      {!isCompleted && onComplete && (
        <button
          onClick={onComplete}
          style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--primary)", color: "white", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          Complete
        </button>
      )}
      {isCompleted && (
        <CheckCircle size={20} color="#22c55e" />
      )}
    </div>
  );
}

function CatchUpCard({ recommendation }: { recommendation: CatchUpRecommendation }) {
  return (
    <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{recommendation.subject}</p>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "20px", background: "#ef4444", color: "white", fontWeight: 600 }}>
          {recommendation.estimatedDurationMinutes}m
        </span>
      </div>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>{recommendation.recommendedAction}</p>
    </div>
  );
}

function RevisionBlockCard({ block }: { block: RevisionBlock }) {
  const priorityColors: Record<string, string> = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#22c55e",
  };

  const color = priorityColors[block.priority];

  return (
    <div style={{ padding: 10, borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{block.subject}</p>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "20px", background: `${color}15`, color, fontWeight: 600, textTransform: "capitalize" }}>
          {block.priority}
        </span>
      </div>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>{block.reason}</p>
    </div>
  );
}

function WeekCard({ schedule, isCurrent, isExpanded, onToggle, completedSessions, onSessionComplete }: { schedule: any; isCurrent: boolean; isExpanded: boolean; onToggle: () => void; completedSessions: StudySession[]; onSessionComplete?: (sessionId: string) => void }) {
  const weekProgress = schedule.progress || 0;

  return (
    <div style={{ borderRadius: 8, background: isCurrent ? "rgba(99,102,241,0.05)" : "var(--muted)", border: isCurrent ? "1px solid rgba(99,102,241,0.2)" : "1px solid var(--card-border)" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", padding: 12, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>Week {schedule.weekNumber}</p>
          {isCurrent && (
            <span style={{ padding: "2px 8px", borderRadius: "20px", background: "#6366f1", color: "white", fontSize: "10px", fontWeight: 600 }}>
              Current
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>{weekProgress}%</p>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--card-border)" }}>
            <div style={{ width: `${weekProgress}%`, height: "100%", background: "#6366f1", borderRadius: 2 }} />
          </div>
        </div>
      </button>
      {isExpanded && (
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {schedule.sessions.slice(0, 5).map((session: StudySession) => (
              <div key={session.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 6, background: "var(--card)" }}>
                <Clock size={14} color="var(--muted-foreground)" />
                <p style={{ fontSize: "12px", margin: 0, flex: 1 }}>{session.subject}</p>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{session.durationMinutes}m</span>
              </div>
            ))}
            {schedule.sessions.length > 5 && (
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0 }}>
                +{schedule.sessions.length - 5} more sessions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getCurrentWeekNumber(plan: StudyPlan): number {
  const now = new Date();
  const start = new Date(plan.startDate);
  const weekNumber = Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(weekNumber, plan.weeklySchedules.length));
}
