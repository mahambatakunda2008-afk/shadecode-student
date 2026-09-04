import { createGenerationJob, getActiveGenerationJobs, getGenerationJobs, markInterruptedJobsForRetry, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { offlineStorage } from "@/lib/offline/storage";

export interface LessonGenerationInput {
  prompt: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  goal: string;
  level?: string;
  examBoard?: string;
}
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; }
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
let runningJobId: string | null = null;
function isBrowser() { return typeof window !== "undefined"; }
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }

async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id;
  saveActiveId(job.id);
  updateGenerationJob(job.id, { status: "warming", progress: Math.max(5, job.progress), error: undefined });
  try {
    updateGenerationJob(job.id, { status: "generating", progress: Math.max(12, job.progress) });
    const response = await fetch("/api/learn/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "lesson", subject: job.request.subject, topic: job.request.prompt, prompt: job.request.prompt, difficulty: job.request.difficulty, goal: job.request.goal, level: job.request.level, examBoard: job.request.examBoard }),
      cache: "no-store",
      keepalive: true,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) throw new Error(data?.error || `Generation failed (${response.status})`);
    if (!data?.id || !Array.isArray(data?.blocks)) throw new Error("The lesson service returned an incomplete lesson.");
    updateGenerationJob(job.id, { status: "partial", progress: 92, partial: { title: data.title, blocks: data.blocks } });
    const result: LessonGenerationResult = { id: data.id, title: data.title || job.request.prompt, blocks: data.blocks };
    const now = new Date().toISOString();
    await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `A complete ${job.request.difficulty} lesson on ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
    updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined });
    if (getActiveId() === job.id) saveActiveId(null);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } catch (error) {
    const offlineNow = isBrowser() && !navigator.onLine;
    updateGenerationJob(job.id, { status: offlineNow ? "queued" : "failed", progress: offlineNow ? Math.min(job.progress, 20) : job.progress, error: offlineNow ? "Waiting for a connection. Your request is safely queued on this device." : errorMessage(error) });
    if (offlineNow) saveActiveId(job.id); else if (getActiveId() === job.id) saveActiveId(null);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally { if (runningJobId === job.id) runningJobId = null; }
}

export function queueLessonGeneration(input: LessonGenerationInput) {
  const job = createGenerationJob("lesson", input);
  if (isBrowser() && !navigator.onLine) updateGenerationJob(job.id, { status: "queued", progress: 0, error: "Waiting for a connection. Your request is safely queued on this device." });
  return job;
}

export async function resumeLessonGeneration(token: string | null) {
  if (!isBrowser() || !token || !navigator.onLine) return null;
  markInterruptedJobsForRetry();
  const active = getActiveGenerationJobs()
    .filter(job => job.kind === "lesson")
    .map(job => job as GenerationJob<LessonGenerationInput>);
  const preferredId = getActiveId();
  const job = (preferredId && active.find(item => item.id === preferredId)) || active[0];
  if (!job) return null;
  return runJob(job, token);
}

export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) {
  const job = queueLessonGeneration(input);
  if (token && isBrowser() && navigator.onLine) {
    void runJob(job, token);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  }
  return job;
}
