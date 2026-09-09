"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Brain, Clock3, Coffee, Focus, Hammer, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { trackEvent } from "@/lib/traction/client";

type Preset = { label: string; minutes: number; icon: typeof Brain };

const PRESETS: Preset[] = [
  { label: "25 min", minutes: 25, icon: Brain },
  { label: "5 min", minutes: 5, icon: Coffee },
  { label: "15 min", minutes: 15, icon: Sparkles },
  { label: "45 min", minutes: 45, icon: Focus },
  { label: "Custom", minutes: 0, icon: Clock3 },
];

function getCopy(family: "foundation" | "school" | "beyond-school", stage: string) {
  if (family === "beyond-school") {
    return {
      eyebrow: stage === "tvet" ? "Practical session" : "Work session",
      title: "Make space for the work.",
      body: "Set a focused block for a course, assignment, project or practical skill. When the block ends, your progress is recorded.",
      start: "Start work",
      running: "Working",
      complete: "Work block complete",
      stat: "Work today",
      icon: BriefcaseBusiness,
    };
  }
  if (family === "school") {
    return {
      eyebrow: "Study session",
      title: "Turn study time into progress.",
      body: "Choose a block for revision, practice or focused learning. Put the distractions away and work the next problem.",
      start: "Start studying",
      running: "Studying",
      complete: "Study session complete",
      stat: "Study today",
      icon: Brain,
    };
  }
  return {
    eyebrow: "Focus time",
    title: "A little focus goes a long way.",
    body: "Pick a short block, explore one thing and give it your full attention. You can pause or start again whenever you need.",
    start: "Start focus",
    running: "Focusing",
    complete: "Focus complete",
    stat: "Focus today",
    icon: Sparkles,
  };
}

export default function ExperienceFocus() {
  const { profile } = useUser();
  const experience = useMemo(() => getAcademicExperience(normalizeStudyLevel(profile?.study_level)), [profile?.study_level]);
  const copy = getCopy(experience.family, experience.stage);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const [userId, setUserId] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef<() => void>(() => {});
  const sessionStartedRef = useRef(false);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const preset = PRESETS[selectedPreset];
  const totalSeconds = selectedPreset === 4 ? customMinutes * 60 : preset.minutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const accent = experience.family === "beyond-school" ? "var(--secondary)" : "var(--primary)";

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const today = new Date().toDateString();
      try {
        const stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}');
        setSessionsToday(Number(stats.sessions) || 0);
        setTotalFocusToday(Number(stats.minutes) || 0);
      } catch {
        setSessionsToday(0);
        setTotalFocusToday(0);
      }
    })();
    return () => { mounted = false; };
  }, [router, supabase]);

  useEffect(() => {
    setTimeLeft(totalSeconds);
    setIsRunning(false);
    setIsFinished(false);
    sessionStartedRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [totalSeconds]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsRunning(false);
          setIsFinished(true);
          completeRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  async function handleSessionComplete() {
    const focusMinutes = selectedPreset === 4 ? customMinutes : preset.minutes;
    const today = new Date().toDateString();
    let stats = { sessions: 0, minutes: 0 };
    try { stats = JSON.parse(localStorage.getItem(`focus_stats_${today}`) || '{"sessions":0,"minutes":0}'); } catch { /* use defaults */ }
    const newStats = { sessions: (Number(stats.sessions) || 0) + 1, minutes: (Number(stats.minutes) || 0) + focusMinutes };
    localStorage.setItem(`focus_stats_${today}`, JSON.stringify(newStats));
    setSessionsToday(newStats.sessions);
    setTotalFocusToday(newStats.minutes);

    void trackEvent("learning_session_completed", {
      mode: preset.label,
      durationMinutes: focusMinutes,
      completed: true,
      experience: experience.family,
      studyLevel: experience.stage,
    });

    if (userId) {
      try {
        const xpEarned = selectedPreset !== 1 && selectedPreset !== 2 ? Math.round(focusMinutes * 0.5) : 0;
        const response = await fetch("/api/focus/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationMinutes: focusMinutes, mode: preset.label, xpEarned }),
        });
        if (!response.ok) console.error("focus completion failed", await response.text());
      } catch (error) {
        console.error("focus completion error:", error);
      }
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(copy.complete, { body: `${focusMinutes} minute session finished.`, icon: "/icon-192.png" });
    }
  }

  useEffect(() => { completeRef.current = handleSessionComplete; });

  const toggleTimer = () => {
    if (isFinished) {
      setTimeLeft(totalSeconds);
      setIsFinished(false);
      sessionStartedRef.current = false;
    }
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (nextRunning && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      void trackEvent("learning_session_started", {
        mode: preset.label,
        durationMinutes: selectedPreset === 4 ? customMinutes : preset.minutes,
        experience: experience.family,
        studyLevel: experience.stage,
      });
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalSeconds);
    sessionStartedRef.current = false;
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) void Notification.requestPermission();
  };

  const Icon = copy.icon;
  const PrimaryButtonIcon = isFinished ? RotateCcw : isRunning ? Pause : Play;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-7 text-[var(--foreground)] sm:px-6 lg:px-8" data-experience={experience.family} data-study-level={experience.stage}>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Icon className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold" style={{ color: accent }}>{copy.eyebrow}</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.title}</h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--muted-foreground)]">{copy.body}</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-8">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Focus duration">
            {PRESETS.map((item, index) => {
              const ItemIcon = item.icon;
              const selected = selectedPreset === index;
              return <button key={item.label} type="button" onClick={() => setSelectedPreset(index)} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition" style={{ borderColor: selected ? accent : "var(--card-border)", background: selected ? "var(--primary-glow)" : "var(--card)", color: selected ? accent : "var(--muted-foreground)" }}><ItemIcon className="h-4 w-4" />{item.label}</button>;
            })}
          </div>

          {selectedPreset === 4 && <label className="mt-4 block max-w-xs text-sm font-semibold">Minutes<input aria-label="Custom focus minutes" type="number" value={customMinutes} onChange={(event) => setCustomMinutes(Math.max(1, Math.min(120, Number.parseInt(event.target.value, 10) || 1)))} min={1} max={120} className="mt-2 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2.5 text-[var(--foreground)] outline-none" /></label>}

          <div className="mt-7 flex flex-col items-center">
            <div className="relative h-[260px] w-[260px]">
              <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90" aria-hidden="true">
                <circle cx="130" cy="130" r="110" fill="none" stroke="var(--muted)" strokeWidth="8" />
                <circle cx="130" cy="130" r="110" fill="none" stroke={isFinished ? "var(--success, #22c55e)" : accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-black tabular-nums">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</div>
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">{isFinished ? copy.complete : isRunning ? copy.running : "Ready"}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={toggleTimer} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-extrabold text-white transition" style={{ background: accent }}><PrimaryButtonIcon className="h-4 w-4" />{isFinished ? "Start again" : isRunning ? "Pause" : copy.start}</button>
              <button type="button" onClick={resetTimer} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 font-bold"><RotateCcw className="h-4 w-4" />Reset</button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"><div className="text-3xl font-black">{sessionsToday}</div><div className="mt-1 text-sm text-[var(--muted-foreground)]">Sessions today</div></div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"><div className="text-3xl font-black">{totalFocusToday}m</div><div className="mt-1 text-sm text-[var(--muted-foreground)]">{copy.stat}</div></div>
        </section>

        <button type="button" onClick={requestNotificationPermission} className="mx-auto flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Hammer className="h-4 w-4" />Enable completion notifications</button>
      </div>
    </main>
  );
}
