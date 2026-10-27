"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";

interface TimetableSlot {
  id?: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  color?: string;
}

interface SubjectRecord {
  id: string;
  name: string;
}

// Subject color palette
const SUBJECT_COLORS = [
  "#3157D5", "#6657D9", "#4778E8", "#8A6CE8",
  "#3F6BC8", "#7A72D6", "#5264B8", "#9A83D9",
  "#405AA8", "#7862B8",
];

const DURATION_PRESETS = [
  { label: "25m", value: "25" },
  { label: "45m", value: "45" },
  { label: "60m", value: "60" },
  { label: "90m", value: "90" },
];

const BREAK_PRESETS = [
  { label: "5m", value: "5" },
  { label: "10m", value: "10" },
  { label: "15m", value: "15" },
  { label: "20m", value: "20" },
];

const TIME_PRESETS = [
  { label: "Early", value: "06:00" },
  { label: "Morning", value: "08:00" },
  { label: "Midday", value: "12:00" },
  { label: "Evening", value: "17:00" },
];

export default function Timetable() {
  const [userSubjects, setUserSubjects] = useState<SubjectRecord[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState("60");
  const [breakDuration, setBreakDuration] = useState("10");
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subjectColorMap, setSubjectColorMap] = useState<Record<string, string>>({});
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
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
  }, [router, supabase]);

  const getSubjectColor = (subject: string, index: number): string => {
    if (subjectColorMap[subject]) return subjectColorMap[subject];
    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    setSubjectColorMap(prev => ({ ...prev, [subject]: color }));
    return color;
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (!selectedSubjects.includes(trimmed)) {
      setSelectedSubjects(prev => [...prev, trimmed]);
    }
    setCustomSubject("");
  };

  const generateSchedule = () => {
    if (selectedSubjects.length === 0) return;
    const durationMinutes = Number.parseInt(duration, 10);
    const breakMinutes = Number.parseInt(breakDuration, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
      setScheduleError("Study session length must be between 1 and 240 minutes.");
      return;
    }
    if (!Number.isInteger(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
      setScheduleError("Break length must be between 1 and 60 minutes.");
      return;
    }
    setScheduleError(null);

    const slots: TimetableSlot[] = [];
    let [hours, minutes] = startTime.split(":").map(Number);

    const addMinutes = (h: number, m: number, mins: number) => {
      const total = h * 60 + m + mins;
      return { h: Math.floor(total / 60) % 24, m: total % 60 };
    };

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    selectedSubjects.forEach((subject, index) => {
      const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
      const start = formatTime(hours, minutes);
      const endTime = addMinutes(hours, minutes, durationMinutes);
      const end = formatTime(endTime.h, endTime.m);

      slots.push({ subject, start_time: start, end_time: end, is_break: false, color });

      if (index < selectedSubjects.length - 1) {
        const breakEnd = addMinutes(endTime.h, endTime.m, breakMinutes);
        slots.push({
          subject: "Break",
          start_time: end,
          end_time: formatTime(breakEnd.h, breakEnd.m),
          is_break: true,
        });
        hours = breakEnd.h;
        minutes = breakEnd.m;
      } else {
        hours = endTime.h;
        minutes = endTime.m;
      }
    });

    setSchedule(slots);
    setSaved(false);

    if (userId) {
      emitCortexEvent({
        userId,
        type: "timetable.generated",
        source: "timetable",
        data: {
          sessions: slots.filter(s => !s.is_break).length,
          breaks: slots.filter(s => s.is_break).length,
          totalMinutes: slots.filter(s => !s.is_break).length * durationMinutes,
        },
      });
    }
  };

  const saveSchedule = async () => {
    if (!userId || schedule.length === 0 || loading) return;
    setLoading(true);
    setSaveError(null);
    setSaved(false);

    try {
      // Replace the schedule in one database transaction. The RPC derives
      // ownership from auth.uid() and persists only real table columns.
      const slots = schedule.map(({ subject, start_time, end_time, is_break }) => ({
        subject,
        start_time,
        end_time,
        is_break,
      }));
      const { error } = await supabase.rpc("replace_own_timetable", { p_slots: slots });

      if (error) {
        console.error("[Timetable] atomic save failed:", error.message);
        setSaveError("Couldn't save your timetable. Your previous saved timetable has been kept. Please try again.");
        return;
      }

      setSaved(true);
      emitCortexEvent({
        userId,
        type: "timetable.saved",
        source: "timetable",
        data: {
          sessions: schedule.filter(s => !s.is_break).length,
          totalMinutes: schedule.filter(s => !s.is_break).length * parseInt(duration, 10),
        },
      });
    } catch (error) {
      console.error("[Timetable] atomic save error:", error);
      setSaveError("Couldn't save your timetable. Your previous saved timetable has been kept. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalStudyMins = schedule.filter(s => !s.is_break).length * (Number.parseInt(duration, 10) || 0);
  const studySessions = schedule.filter(s => !s.is_break).length;

  // Shared chip styles. Per-subject colours are data-driven, so those few values stay inline; everything else is tokens/utilities.
  const chipBase = "inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]";
  const chipOn = "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--primary-glow)] font-bold text-[var(--primary)]";
  const chipOff = "border-transparent bg-[var(--muted)] font-normal text-[var(--muted-foreground)] hover:text-[var(--foreground)]";
  const chipBreakOn = "border-amber-500/40 bg-amber-500/15 font-bold text-amber-500";
  const sectionTitle = "mb-2.5 text-sm font-bold";
  const fieldLabel = "mb-1.5 text-xs text-[var(--muted-foreground)]";

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-start gap-3">
        <ShadecodeFeatureIcon feature="timetable" size="sm" />
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--primary)]">Plan your study time</p>
          <h1 className="mt-0.5 text-2xl font-extrabold sm:text-[28px]">Timetable</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Build your colour-coded study plan</p>
        </div>
      </div>

      {/* Subject selector */}
      <div className="ssc-card p-4">
        <p className={sectionTitle}>Subjects</p>

        {userSubjects.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {userSubjects.map((s, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              const selected = selectedSubjects.includes(s.name);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSubject(s.name)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)] ${selected ? "font-bold" : "border-transparent bg-[var(--muted)] font-normal text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                  style={selected ? { background: `${color}20`, borderColor: `${color}60`, color } : undefined}
                >
                  {selected && <span className="mr-1" aria-hidden="true">●</span>}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <input
            placeholder="Add subject..."
            aria-label="Add a custom subject"
            value={customSubject}
            onChange={e => setCustomSubject(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomSubject()}
            className="ssc-input min-w-0 flex-1"
          />
          <button type="button" aria-label="Add subject" onClick={addCustomSubject} className="ssc-button min-w-11 px-3.5 font-bold">+</button>
        </div>

        {selectedSubjects.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selectedSubjects.map((s, i) => {
              const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
              return (
                <span key={s} className="flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold" style={{ background: `${color}20`, color }}>
                  <span className="min-w-0 truncate">{s}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${s} from schedule`}
                    onClick={() => setSelectedSubjects(prev => prev.filter(x => x !== s))}
                    className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-xs text-inherit hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-[color:var(--primary)]"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Time settings */}
      <div className="ssc-card p-4">
        <p className={sectionTitle}>Schedule Settings</p>

        {/* Start time presets */}
        <p className={fieldLabel}>Start time</p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {TIME_PRESETS.map(p => (
            <button type="button" key={p.value} onClick={() => setStartTime(p.value)} aria-pressed={startTime === p.value} className={`${chipBase} ${startTime === p.value ? chipOn : chipOff}`}>
              {p.label}
            </button>
          ))}
          <input type="time" aria-label="Schedule start time" value={startTime} onChange={e => setStartTime(e.target.value)} className="ssc-input min-h-10! w-[7.5rem]! px-2.5! py-1.5! text-[13px]!" />
        </div>

        {/* Study duration presets */}
        <p className={fieldLabel}>Study session length</p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map(p => (
            <button type="button" key={p.value} onClick={() => setDuration(p.value)} aria-pressed={duration === p.value} className={`${chipBase} ${duration === p.value ? chipOn : chipOff}`}>
              {p.label}
            </button>
          ))}
          <input type="number" min={1} max={240} step={1} inputMode="numeric" aria-label="Custom study session length in minutes" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Custom" className="ssc-input min-h-10! w-24! px-2.5! py-1.5! text-[13px]!" />
        </div>

        {/* Break duration presets */}
        <p className={fieldLabel}>Break length</p>
        <div className="flex flex-wrap gap-1.5">
          {BREAK_PRESETS.map(p => (
            <button type="button" key={p.value} onClick={() => setBreakDuration(p.value)} aria-pressed={breakDuration === p.value} className={`${chipBase} ${breakDuration === p.value ? chipBreakOn : chipOff}`}>
              <span aria-hidden="true" className="mr-1">☕</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {scheduleError && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{scheduleError}</p>}

      <button type="button" onClick={generateSchedule} disabled={selectedSubjects.length === 0} className="ssc-button min-h-12 w-full text-[15px] font-extrabold">
        Generate Schedule →
      </button>

      {/* Schedule display */}
      {schedule.length > 0 && (
        <div className="ssc-card p-4">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold">Today&apos;s Plan</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {studySessions} sessions · {totalStudyMins} min total
              </p>
            </div>
            <button
              type="button"
              onClick={saveSchedule}
              disabled={loading || saved}
              aria-live="polite"
              className={`inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-default ${saved ? "border-green-500/30 bg-green-500/15 text-green-500" : "border-[var(--card-border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-60"}`}
            >
              {saved ? "✓ Saved" : loading ? "Saving..." : "Save Plan"}
            </button>
          </div>

          {saveError && (
            <p role="alert" className="mb-3 text-[13px] text-[var(--danger,#ef4444)]">
              {saveError}
            </p>
          )}

          {/* Visual timeline */}
          <div className="flex flex-col gap-1.5">
            {schedule.map((slot, index) => {
              const color = slot.color || "#6366f1";
              const accent = slot.is_break ? "#f59e0b" : color;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5"
                  style={{ background: slot.is_break ? "rgba(245,158,11,0.06)" : `${color}10`, borderColor: slot.is_break ? "rgba(245,158,11,0.15)" : `${color}30` }}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: slot.is_break ? "#f59e0b" : (slot.color || "var(--primary)") }}>
                    {slot.is_break ? "☕ Break" : slot.subject}
                  </p>
                  <p className="shrink-0 text-xs text-[var(--muted-foreground)]">
                    {slot.start_time} – {slot.end_time}
                  </p>
                  {!slot.is_break && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${color}20`, color }}>
                      {duration}m
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--card-border)] pt-3">
            {[
              { label: "Sessions", value: studySessions, icon: "📚" },
              { label: "Study time", value: `${totalStudyMins}m`, icon: "⏱" },
              { label: "Breaks", value: schedule.filter(s => s.is_break).length, icon: "☕" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-extrabold text-[var(--primary)]"><span aria-hidden="true">{stat.icon}</span> {stat.value}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
