"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Exam {
  id: string;
  subject: string;
  exam_date: string;
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", user.id)
        .order("exam_date");
      if (data) setExams(data);
      setLoading(false);
    };
    init();
  }, []);

  const addExam = async () => {
    if (!subject.trim() || !examDate || !userId) return;

    const { data } = await supabase
      .from("exams")
      .insert({ user_id: userId, subject: subject.trim(), exam_date: examDate })
      .select()
      .single();

    if (data) {
      setExams([...exams, data].sort((a, b) =>
        new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      ));
      setSubject("");
      setExamDate("");
    }
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      console.error("[Exams] delete failed:", error.message);
      setDeleteError("Couldn't delete that exam. Please try again.");
      return;
    }
    setDeleteError(null);
    setExams(exams.filter(e => e.id !== id));
  };

  const getDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDay = new Date(dateStr);
    examDay.setHours(0, 0, 0, 0);
    const diff = Math.ceil((examDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "#ef4444";
    if (days <= 14) return "#f59e0b";
    if (days <= 30) return "#6366f1";
    return "var(--success)";
  };

  const getUrgencyLabel = (days: number) => {
    if (days < 0) return "Passed";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days <= 7) return "This week";
    if (days <= 14) return "Next week";
    return `${days} days`;
  };

  if (loading) return (
    <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
      Loading...
    </div>
  );

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>Exams</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Track your upcoming exams
        </p>
      </div>

      {deleteError && (
        <div style={{ ...cardStyle, borderColor: "var(--danger, #ef4444)", color: "var(--danger, #ef4444)", fontSize: "13px" }}>
          {deleteError}
        </div>
      )}

      {/* Add Exam */}
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "12px" }}>Add Exam</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Subject</p>
            <input
              placeholder="e.g. Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Exam Date</p>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>
          <button
            onClick={addExam}
            disabled={!subject.trim() || !examDate}
            style={{
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 0 16px var(--primary-glow)",
              opacity: !subject.trim() || !examDate ? 0.5 : 1,
            }}
          >
            Add Exam
          </button>
        </div>
      </div>

      {/* Exam List */}
      {exams.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "32px" }}>
          <p style={{ fontSize: "32px" }}>📝</p>
          <p style={{ color: "var(--muted-foreground)", marginTop: "8px" }}>
            No exams added yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {exams.map((exam) => {
            const days = getDaysLeft(exam.exam_date);
            const color = getUrgencyColor(days);
            const label = getUrgencyLabel(days);

            return (
              <div key={exam.id} style={{
                ...cardStyle,
                border: `1px solid ${color}30`,
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}>
                {/* Countdown circle */}
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: `${color}10`,
                }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, color, lineHeight: 1 }}>
                    {days < 0 ? "✓" : days}
                  </p>
                  {days >= 0 && (
                    <p style={{ fontSize: "9px", color, opacity: 0.8 }}>days</p>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "15px" }}>{exam.subject}</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                    {new Date(exam.exam_date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p style={{ fontSize: "12px", color, marginTop: "4px", fontWeight: 600 }}>
                    {label}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteExam(exam.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "4px",
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
