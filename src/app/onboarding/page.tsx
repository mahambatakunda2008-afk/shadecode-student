"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [schedule, setSchedule] = useState<{ subject: string; start_time: string; end_time: string; is_break: boolean }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Get user on mount
  useState(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  });

  const addSubject = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    setSubjects([...subjects, trimmed]);
    setSubjectInput("");
  };

  const removeSubject = (s: string) => {
    setSubjects(subjects.filter(sub => sub !== s));
  };

  const generateSchedule = () => {
    const slots: typeof schedule = [];
    let [hours, minutes] = startTime.split(":").map(Number);

    const addMinutes = (h: number, m: number, mins: number) => {
      const total = h * 60 + m + mins;
      return { h: Math.floor(total / 60) % 24, m: total % 60 };
    };

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    subjects.forEach((subject, index) => {
      const start = formatTime(hours, minutes);
      const endT = addMinutes(hours, minutes, 60);
      const end = formatTime(endT.h, endT.m);
      slots.push({ subject, start_time: start, end_time: end, is_break: false });

      if (index < subjects.length - 1) {
        const breakEndT = addMinutes(endT.h, endT.m, 10);
        slots.push({ subject: "Break", start_time: end, end_time: formatTime(breakEndT.h, breakEndT.m), is_break: true });
        hours = breakEndT.h;
        minutes = breakEndT.m;
      } else {
        hours = endT.h;
        minutes = endT.m;
      }
    });

    setSchedule(slots);
    setStep(3);
  };

  const finish = async () => {
    if (!userId) return;
    setLoading(true);

    // Save subjects
    await supabase.from("subjects").insert(
      subjects.map(name => ({ user_id: userId, name }))
    );

    // Save timetable
    await supabase.from("timetable").insert(
      schedule.map(slot => ({ ...slot, user_id: userId }))
    );

    // Mark onboarding complete
    await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", userId);

    router.push("/dashboard?tour=true");
  };

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "20px",
  };

  const inputStyle = {
    flex: 1,
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "var(--foreground)",
    fontSize: "15px",
    outline: "none",
    width: "100%",
  };

  const primaryBtn = {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 0 16px var(--primary-glow)",
  };

  return (
    <div style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: "24px", minHeight: "100vh" }}>

      {/* Progress */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1,
            height: "4px",
            borderRadius: "99px",
            background: s <= step ? "var(--primary)" : "var(--muted)",
            transition: "background 0.3s ease",
          }} />
        ))}
      </div>

      {/* Step 1 - Welcome */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
              Welcome
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px", lineHeight: 1.2 }}>
              Let's set up your<br />
              <span style={{ color: "var(--primary)" }}>study environment</span>
            </h1>
            <p style={{ color: "var(--muted-foreground)", marginTop: "12px", fontSize: "15px", lineHeight: 1.6 }}>
              We'll help you add your subjects, generate a timetable, and get you ready to study in under 2 minutes.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { icon: "📚", text: "Add your subjects" },
              { icon: "📅", text: "Generate a smart timetable" },
              { icon: "🧠", text: "Meet Cortex, your study intelligence" },
            ].map(item => (
              <div key={item.text} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>{item.icon}</span>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{item.text}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setStep(2)} style={primaryBtn}>
            Get Started
          </button>
        </div>
      )}

      {/* Step 2 - Add Subjects */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
              Step 1 of 2
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
              Add your subjects
            </h1>
            <p style={{ color: "var(--muted-foreground)", marginTop: "8px", fontSize: "15px" }}>
              Add all the subjects you're currently studying.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                placeholder="e.g. Mathematics"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                style={inputStyle}
              />
              <button
                onClick={addSubject}
                style={{
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Add
              </button>
            </div>

            {/* Subject chips */}
            {subjects.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {subjects.map(s => (
                  <div key={s} style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "99px",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>{s}</span>
                    <button
                      onClick={() => removeSubject(s)}
                      style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "14px", padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={subjects.length === 0}
            style={{ ...primaryBtn, opacity: subjects.length === 0 ? 0.5 : 1 }}
          >
            Continue ({subjects.length} subject{subjects.length !== 1 ? "s" : ""} added)
          </button>
        </div>
      )}

      {/* Step 3 - Timetable */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <p style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
              Step 2 of 2
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
              Generate your timetable
            </h1>
            <p style={{ color: "var(--muted-foreground)", marginTop: "8px", fontSize: "15px" }}>
              Pick a start time and we'll build your schedule.
            </p>
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "8px" }}>Start Time</p>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={inputStyle}
            />
          </div>

          {schedule.length === 0 ? (
            <button onClick={generateSchedule} style={primaryBtn}>
              Generate Schedule
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={cardStyle}>
                <p style={{ fontWeight: 700, marginBottom: "12px" }}>Your Plan</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {schedule.map((slot, index) => (
                    <div key={index} style={{
                      background: slot.is_break ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)",
                      border: `1px solid ${slot.is_break ? "rgba(245,158,11,0.2)" : "rgba(99,102,241,0.2)"}`,
                      borderRadius: "8px",
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}>
                      <p style={{ fontWeight: 600, fontSize: "14px", color: slot.is_break ? "#f59e0b" : "var(--primary)" }}>
                        {slot.is_break ? "☕ Break" : slot.subject}
                      </p>
                      <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                        {slot.start_time} - {slot.end_time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={finish} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Setting up..." : "Go to Dashboard 🚀"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}