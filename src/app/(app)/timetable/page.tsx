"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { useUser } from "@/contexts/UserContext";

interface TimetableSlot {
  id?: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  color?: string;
}

interface SubjectRecord { id: string; name: string; }

const SUBJECT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "var(--danger)", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];
const DURATION_PRESETS = [
  { label: "25m", value: "25", icon: "⚡" }, { label: "45m", value: "45", icon: "📖" },
  { label: "60m", value: "60", icon: "🧠" }, { label: "90m", value: "90", icon: "🔥" },
];
const BREAK_PRESETS = [{ label: "5m", value: "5" }, { label: "10m", value: "10" }, { label: "15m", value: "15" }, { label: "20m", value: "20" }];
const TIME_PRESETS = [{ label: "🌅 Early", value: "06:00" }, { label: "🌤 Morning", value: "08:00" }, { label: "☀️ Midday", value: "12:00" }, { label: "🌆 Evening", value: "17:00" }];

export default function Timetable() {
  const { profile, loading: profileLoading } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const isFoundation = experience.family === "foundation";
  const isBeyond = experience.family === "beyond-school";
  const title = isFoundation ? "My schedule" : isBeyond ? "My schedule" : "Study timetable";
  const subtitle = isFoundation
    ? "Plan a simple rhythm for learning, practice and breaks"
    : isBeyond
      ? "Organise courses, assignments, projects and focused work"
      : "Build a focused revision and study schedule";
  const sessionLabel = isFoundation ? "Activity length" : isBeyond ? "Work session length" : "Study session length";
  const breakLabel = isFoundation ? "Break length" : "Break length";

  const [userSubjects, setUserSubjects] = useState<SubjectRecord[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("60");
  const [breakDuration, setBreakDuration] = useState("10");
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (profileLoading) return;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const [{ data: subjectsData }, { data: timetableData }] = await Promise.all([
        supabase.from("subjects").select("*").eq("user_id", user.id),
        supabase.from("timetable").select("*").eq("user_id", user.id).order("start_time"),
      ]);
      if (subjectsData) setUserSubjects(subjectsData);
      if (timetableData && timetableData.length > 0) setSchedule(timetableData);
    };
    init();
  }, [profileLoading, router, supabase]);

  const toggleSubject = (name: string) => setSelectedSubjects(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (!selectedSubjects.includes(trimmed)) setSelectedSubjects(prev => [...prev, trimmed]);
    setCustomSubject("");
  };

  const generateSchedule = () => {
    if (selectedSubjects.length === 0) return;
    const slots: TimetableSlot[] = [];
    let [hours, minutes] = startTime.split(":").map(Number);
    const addMinutes = (h: number, m: number, mins: number) => { const total = h * 60 + m + mins; return { h: Math.floor(total / 60) % 24, m: total % 60 }; };
    const formatTime = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    selectedSubjects.forEach((subject, index) => {
      const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
      const start = formatTime(hours, minutes);
      const endTime = addMinutes(hours, minutes, parseInt(duration));
      const end = formatTime(endTime.h, endTime.m);
      slots.push({ subject, start_time: start, end_time: end, is_break: false, color });
      if (index < selectedSubjects.length - 1) {
        const breakEnd = addMinutes(endTime.h, endTime.m, parseInt(breakDuration));
        slots.push({ subject: "Break", start_time: end, end_time: formatTime(breakEnd.h, breakEnd.m), is_break: true });
        hours = breakEnd.h; minutes = breakEnd.m;
      } else { hours = endTime.h; minutes = endTime.m; }
    });
    setSchedule(slots); setSaved(false);
    if (userId) emitCortexEvent({ userId, type: "timetable.generated", source: "timetable", data: { sessions: slots.filter(s => !s.is_break).length, breaks: slots.filter(s => s.is_break).length, totalMinutes: slots.filter(s => !s.is_break).length * parseInt(duration) } });
  };

  const saveSchedule = async () => {
    if (!userId || schedule.length === 0) return;
    setLoading(true); setSaveError(null);
    const { error: delErr } = await supabase.from("timetable").delete().eq("user_id", userId);
    if (delErr) { console.error("[Timetable] delete failed, aborting save:", delErr.message); setSaveError("Couldn't save your timetable. Please try again."); setLoading(false); return; }
    const { error: insErr } = await supabase.from("timetable").insert(schedule.map(slot => ({ ...slot, user_id: userId })));
    if (insErr) { console.error("[Timetable] insert failed after delete, data lost:", insErr.message); setSaveError("Your timetable failed to save and may be empty now. Please recreate it or try again."); setLoading(false); return; }
    setSaved(true); setLoading(false);
    emitCortexEvent({ userId, type: "timetable.saved", source: "timetable", data: { sessions: schedule.filter(s => !s.is_break).length, totalMinutes: schedule.filter(s => !s.is_break).length * parseInt(duration) } });
  };

  const totalStudyMins = schedule.filter(s => !s.is_break).length * parseInt(duration);
  const studySessions = schedule.filter(s => !s.is_break).length;
  const cardStyle = { background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px" };
  const inputStyle = { width: "100%", background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "10px 14px", color: "var(--foreground)", fontSize: "14px", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>{title}</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>{subtitle}</p>
      </div>
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>{isFoundation ? "What are we doing?" : isBeyond ? "Courses & work" : "Subjects"}</p>
        {userSubjects.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>{userSubjects.map((s, i) => { const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length]; const selected = selectedSubjects.includes(s.name); return <button key={s.id} onClick={() => toggleSubject(s.name)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer", background: selected ? `${color}20` : "var(--muted)", border: selected ? `1px solid ${color}60` : "1px solid transparent", color: selected ? color : "var(--muted-foreground)", fontWeight: selected ? 700 : 400, transition: "all 0.2s" }}>{selected && <span style={{ marginRight: "4px" }}>●</span>}{s.name}</button>; })}</div>}
        <div style={{ display: "flex", gap: "8px" }}><input placeholder={isFoundation ? "Add an activity..." : isBeyond ? "Add a course or project..." : "Add subject..."} value={customSubject} onChange={e => setCustomSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomSubject()} style={{ ...inputStyle, flex: 1 }} /><button onClick={addCustomSubject} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>+</button></div>
        {selectedSubjects.length > 0 && <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>{selectedSubjects.map((s, i) => <span key={s} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}20`, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>{s}<button onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: "12px" }}>✕</button></span>)}</div>}
      </div>
      <div style={cardStyle}>
        <p style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>Schedule Settings</p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>Start time</p>
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>{TIME_PRESETS.map(p => <button key={p.value} onClick={() => setStartTime(p.value)} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", background: startTime === p.value ? "var(--primary-glow)" : "var(--muted)", border: startTime === p.value ? "1px solid var(--primary)" : "1px solid transparent", color: startTime === p.value ? "var(--primary)" : "var(--muted-foreground)", fontWeight: startTime === p.value ? 700 : 400 }}>{p.label}</button>)}<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, width: "110px", padding: "6px 10px", fontSize: "12px" }} /></div>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>{sessionLabel}</p>
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>{DURATION_PRESETS.map(p => <button key={p.value} onClick={() => setDuration(p.value)} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", background: duration === p.value ? "var(--primary-glow)" : "var(--muted)", border: duration === p.value ? "1px solid var(--primary)" : "1px solid transparent", color: duration === p.value ? "var(--primary)" : "var(--muted-foreground)", fontWeight: duration === p.value ? 700 : 400 }}>{p.icon} {p.label}</button>)}<input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Custom" style={{ ...inputStyle, width: "80px", padding: "6px 10px", fontSize: "12px" }} /></div>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>{breakLabel}</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{BREAK_PRESETS.map(p => <button key={p.value} onClick={() => setBreakDuration(p.value)} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", background: breakDuration === p.value ? "rgba(245,158,11,0.15)" : "var(--muted)", border: breakDuration === p.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent", color: breakDuration === p.value ? "#f59e0b" : "var(--muted-foreground)", fontWeight: breakDuration === p.value ? 700 : 400 }}>☕ {p.label}</button>)}</div>
      </div>
      {selectedSubjects.length > 0 && <button onClick={generateSchedule} style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "white", fontSize: "14px", fontWeight: 800, cursor: "pointer" }}>{isFoundation ? "Build my day" : isBeyond ? "Build my work schedule" : "Build my study timetable"}</button>}
      {schedule.length > 0 && <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}><div><p style={{ fontWeight: 800, margin: 0 }}>{isFoundation ? "Your plan" : isBeyond ? "Your work schedule" : "Your study timetable"}</p><p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "3px 0 0" }}>{studySessions} {isFoundation ? "activities" : isBeyond ? "work blocks" : "study sessions"} · {totalStudyMins} min</p></div><button onClick={saveSchedule} disabled={loading} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--card-border)", background: saved ? "var(--primary-glow)" : "var(--muted)", color: saved ? "var(--primary)" : "var(--foreground)", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Saving…" : saved ? "Saved" : "Save"}</button></div>{saveError && <p style={{ fontSize: "12px", color: "var(--danger)", margin: "0 0 10px" }}>{saveError}</p>}{schedule.map((slot, index) => <div key={`${slot.start_time}-${slot.subject}-${index}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderTop: index ? "1px solid var(--card-border)" : "none" }}><div style={{ width: 8, height: 34, borderRadius: 4, background: slot.is_break ? "#f59e0b" : slot.color }} /><div style={{ minWidth: 92, fontSize: "12px", color: "var(--muted-foreground)" }}>{slot.start_time} – {slot.end_time}</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{slot.subject}</div></div>)}</div>}
    </div>
  );
}
