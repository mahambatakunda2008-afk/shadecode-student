"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getExamAttempt, saveExamAttempt, type LocalExamAttempt } from "@/lib/local-first/exam-attempt";

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
      current: Number.isFinite(value.current) ? value.current : 0,
      seconds: Number.isFinite(value.seconds) ? value.seconds : 0,
      totalSeconds: Number.isFinite(value.totalSeconds) ? value.totalSeconds : value.seconds || 0,
      startedAt: value.startedAt,
      flags: Array.isArray(value.flags) ? value.flags : [],
      canvas: typeof value.canvas === "string" ? value.canvas : "",
      level: Number.isFinite(value.level) ? value.level : 1,
      count: Number.isFinite(value.count) ? value.count : value.questions.length,
    };
  } catch {
    return null;
  }
}

function toAttempt(saved: LegacyExam): LocalExamAttempt {
  const totalSeconds = Math.max(0, Math.floor(saved.totalSeconds));
  return {
    attemptId: saved.workId,
    subject: saved.subject,
    topic: saved.topic || "",
    level: Math.max(0, Math.min(2, Math.floor(saved.level ?? 1))),
    count: Math.max(1, Math.floor(saved.count ?? saved.questions.length)),
    questions: saved.questions,
    answers: saved.answers,
    current: Math.max(0, Math.min(saved.questions.length - 1, Math.floor(saved.current))),
    seconds: Math.max(0, Math.min(totalSeconds, Math.floor(saved.seconds))),
    totalSeconds,
    startedAt: saved.startedAt,
    flags: saved.flags || [],
    canvas: saved.canvas || "",
    status: "active",
    updatedAt: new Date().toISOString(),
  };
}

export default function ExamAttemptLocalBridge({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    void createClient().auth.getUser().then(({ data }) => {
      if (alive) setUserId(data.user?.id ?? null);
    }).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;

    const hydrate = async () => {
      try {
        const records = await (await import("@/lib/local-first/store")).localFirstStore.list(userId);
        const active = records
          .filter((record) => record.entity === "exam_attempt" && !record.deletedAt)
          .map((record) => record.payload as LocalExamAttempt)
          .filter((attempt) => attempt.status === "active")
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
        if (!active || cancelled) return;
        const raw = localStorage.getItem(`${LEGACY_KEY}:${userId}`);
        if (!raw) {
          const legacy: LegacyExam = {
            workId: active.attemptId,
            subject: active.subject,
            topic: active.topic,
            questions: active.questions,
            answers: active.answers,
            current: active.current,
            seconds: active.seconds,
            totalSeconds: active.totalSeconds,
            startedAt: active.startedAt,
            flags: active.flags,
            canvas: active.canvas,
            level: active.level,
            count: active.count,
          };
          localStorage.setItem(`${LEGACY_KEY}:${userId}`, JSON.stringify(legacy));
        }
      } catch {
        // Local recovery must never block the exam UI.
      }
    };

    void hydrate();

    const sync = async () => {
      try {
        const raw = localStorage.getItem(`${LEGACY_KEY}:${userId}`);
        if (!raw || raw === lastRaw.current) return;
        lastRaw.current = raw;
        const saved = parse(raw);
        if (!saved) return;
        const attempt = toAttempt(saved);
        const existing = await getExamAttempt(userId, attempt.attemptId);
        if (!existing || existing.updatedAt !== attempt.updatedAt) await saveExamAttempt(userId, attempt);
      } catch {
        // The legacy workspace remains a local fallback if IndexedDB is unavailable.
      }
    };

    const timer = window.setInterval(() => void sync(), 1000);
    void sync();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [ready, userId]);

  return <>{children}</>;
}
