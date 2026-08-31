"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getExamAttempt, saveExamAttempt, type LocalExamAttempt } from "@/lib/local-first/exam-attempt";
import { localFirstStore } from "@/lib/local-first/store";
import { buildFallbackExam } from "@/lib/exam/fallbackExam";

const LEGACY_KEY = "shadecode-exam-workspace";

type LegacyExam = {
  workId: string;
  subject: string;
  topic?: string;
  questions: LocalExamAttempt["questions"];
  answers: LocalExamAttempt["answers"];
  current: number;
  seconds: number;
  totalSeconds: number;
  startedAt: number;
  flags?: number[];
  canvas?: string;
  level?: number;
  count?: number;
};

type Props = { children: ReactNode; subject?: string; topic?: string; count?: number; level?: number };

function parse(raw: string | null): LegacyExam | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LegacyExam>;
    if (!value.workId || !value.subject || !Array.isArray(value.questions) || !value.questions.length) return null;
    if (!Array.isArray(value.answers) || !Number.isFinite(value.startedAt)) return null;
    return {
      workId: value.workId,
      subject: value.subject,
      topic: value.topic || "",
      questions: value.questions,
      answers: value.answers,
      current: Number.isFinite(value.current) ? Number(value.current) : 0,
      seconds: Number.isFinite(value.seconds) ? Number(value.seconds) : 0,
      totalSeconds: Number.isFinite(value.totalSeconds) ? Number(value.totalSeconds) : Number(value.seconds || 0),
      startedAt: Number(value.startedAt),
      flags: Array.isArray(value.flags) ? value.flags : [],
      canvas: typeof value.canvas === "string" ? value.canvas : "",
      level: Number.isFinite(value.level) ? Number(value.level) : 1,
      count: Number.isFinite(value.count) ? Number(value.count) : value.questions.length,
    };
  } catch { return null; }
}

function toAttempt(saved: LegacyExam, userId: string): LocalExamAttempt {
  const totalSeconds = Math.max(0, Math.floor(Number(saved.totalSeconds) || 0));
  const count = Math.max(1, Math.floor(Number(saved.count) || saved.questions.length));
  return {
    attemptId: saved.workId,
    userId,
    subject: saved.subject,
    topic: saved.topic || "",
    level: Math.max(0, Math.min(2, Math.floor(Number(saved.level) || 0))),
    count,
    questions: saved.questions,
    answers: saved.answers,
    current: Math.max(0, Math.min(saved.questions.length - 1, Math.floor(Number(saved.current) || 0))),
    seconds: Math.max(0, Math.min(totalSeconds, Math.floor(Number(saved.seconds) || 0))),
    totalSeconds,
    startedAt: Number(saved.startedAt),
    flags: saved.flags || [],
    canvas: saved.canvas || "",
    status: "active",
    updatedAt: new Date().toISOString(),
  };
}

function toLegacy(attempt: LocalExamAttempt): LegacyExam {
  return { workId: attempt.attemptId, subject: attempt.subject, topic: attempt.topic, questions: attempt.questions, answers: attempt.answers, current: attempt.current, seconds: attempt.seconds, totalSeconds: attempt.totalSeconds, startedAt: attempt.startedAt, flags: attempt.flags, canvas: attempt.canvas, level: attempt.level, count: attempt.count };
}

function seedOfflineAttempt(subject: string, topic: string, count: number, level: number): LegacyExam | null {
  if (!subject.trim()) return null;
  const difficulty = level >= 2 ? "hard" : level <= 0 ? "easy" : "medium";
  const generated = buildFallbackExam(subject, topic, difficulty, count);
  if (!generated.questions.length) return null;
  const questions = generated.questions.map((question, index) => ({ id: index + 1, type: question.type, question: question.question, options: question.options, marks: question.marks, topic: question.topic, modelAnswer: question.modelAnswer, markingCriteria: question.markingCriteria })) as LocalExamAttempt["questions"];
  const totalSeconds = Math.max(300, Math.round(generated.durationMinutes * 60));
  return { workId: `exam:offline:${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, subject, topic, questions, answers: [], current: 0, seconds: totalSeconds, totalSeconds, startedAt: Date.now(), flags: [], canvas: "", level: Math.max(0, Math.min(2, Math.floor(Number(level) || 0))), count: questions.length };
}

export default function ExamAttemptLocalBridge({ children, subject = "", topic = "", count = 10, level = 1 }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    void createClient().auth.getUser().then(({ data }) => { if (alive) setUserId(data.user?.id ?? null); }).finally(() => { if (alive) setAuthReady(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) { setHydrated(true); return; }
    let cancelled = false;
    const hydrate = async () => {
      try {
        const key = `${LEGACY_KEY}:${userId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = parse(raw);
          if (saved) {
            const existing = await getExamAttempt(userId, saved.workId);
            if (!existing) await saveExamAttempt(userId, toAttempt(saved, userId));
            lastRaw.current = raw;
            return;
          }
        }
        const records = await localFirstStore.list(userId);
        const active = records.filter((record) => record.entity === "exam_attempt" && !record.deletedAt).map((record) => record.payload as LocalExamAttempt).filter((attempt) => attempt.status === "active").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
        if (active && !cancelled) {
          const legacy = JSON.stringify(toLegacy(active));
          localStorage.setItem(key, legacy); lastRaw.current = legacy; return;
        }
        if (!navigator.onLine && subject.trim() && !cancelled) {
          const seeded = seedOfflineAttempt(subject, topic, count, level);
          if (seeded) { const legacy = JSON.stringify(seeded); localStorage.setItem(key, legacy); await saveExamAttempt(userId, toAttempt(seeded, userId)); lastRaw.current = legacy; }
        }
      } catch { /* Local recovery is best-effort and must never make the route hang. */ }
      finally { if (!cancelled) setHydrated(true); }
    };
    void hydrate();
    const sync = async () => {
      try {
        const raw = localStorage.getItem(`${LEGACY_KEY}:${userId}`);
        if (!raw || raw === lastRaw.current) return;
        lastRaw.current = raw;
        const saved = parse(raw);
        if (!saved) return;
        await saveExamAttempt(userId, toAttempt(saved, userId));
      } catch { /* Existing local workspace remains the fallback if IndexedDB is unavailable. */ }
    };
    const timer = window.setInterval(() => void sync(), 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [authReady, count, level, subject, topic, userId]);

  if (!hydrated) return null;
  return <>{children}</>;
}
