import { createGenerationJob, getActiveGenerationJobs, getGenerationJobs, markInterruptedJobsForRetry, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { offlineStorage } from "@/lib/offline/storage";
import { generateLocalLesson, hasHighQualityLocalLesson } from "@/lib/cortex/localLessonGenerator";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; }
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
// The API can perform a curriculum lookup, an initial generation, and a quality-repair pass.
// Keep the client timeout below the server's 90s maxDuration, but long enough for the full
// quality-gated path to finish instead of falsely reporting a 35s failure.
const CLOUD_GENERATION_TIMEOUT_MS = 82_000;
let runningJobId: string | null = null;
function isBrowser() { return typeof window !== "undefined"; }
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
function openCompletedLesson(result: LessonGenerationResult) { if (!isBrowser() || window.location.pathname !== "/learn") return; window.location.assign(`/learn/${encodeURIComponent(result.id)}`); }

async function saveLocalResult(job: GenerationJob<LessonGenerationInput>) {
  const local = generateLocalLesson(job.request.subject, job.request.prompt);
  const result: LessonGenerationResult = { id: local.id, title: local.title, blocks: local.blocks, offlineFallback: true };
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `Offline study session for ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
  updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined });
  if (getActiveId() === job.id) saveActiveId(null);
  openCompletedLesson(result);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}

async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id);
  updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  try {
    updateGenerationJob(job.id, { status: "generating", progress: 12 });
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), CLOUD_GENERATION_TIMEOUT_MS);
    const ticker = setInterval(() => { const current = getGenerationJob(job.id)?.progress ?? 12; updateGenerationJob(job.id, { progress: Math.min(88, current + (current < 60 ? 3 : 1)) }); }, 1800);
    let response: Response;
    try { response = await fetch("/api/learn/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: "lesson", subject: job.request.subject, topic: job.request.prompt, prompt: job.request.prompt, difficulty: job.request.difficulty, goal: job.request.goal, level: job.request.level, examBoard: job.request.examBoard }), cache: "no-store", signal: controller.signal }); } finally { clearTimeout(timeout); clearInterval(ticker); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) throw new Error(data?.error || `Generation failed (${response.status})`);
    if (!data?.id || !Array.isArray(data?.blocks)) throw new Error("The lesson service returned an incomplete lesson.");
    updateGenerationJob(job.id, { status: "partial", progress: 92, partial: { title: data.title, blocks: data.blocks } });
    const result: LessonGenerationResult = { id: data.id, title: data.title || job.request.prompt, blocks: data.blocks };
    const now = new Date().toISOString();
    await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `A complete ${job.request.difficulty} lesson on ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
    updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined });
    if (getActiveId() === job.id) saveActiveId(null); openCompletedLesson(result);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? `Generation exceeded ${Math.round(CLOUD_GENERATION_TIMEOUT_MS / 1000)} seconds.` : errorMessage(error);
    // If the cloud lesson path is unavailable but we have a deterministic, high-quality
    // lesson for this exact topic, keep the learner moving instead of surfacing a dead end.
    // Generic local fallback remains offline-only because it intentionally avoids inventing facts.
    if (isBrowser() && navigator.onLine && hasHighQualityLocalLesson(job.request.subject, job.request.prompt)) {
      console.warn("[LEARN] cloud generation unavailable; opening high-quality local lesson", { subject: job.request.subject, topic: job.request.prompt, error: message });
      return saveLocalResult(job);
    }
    if (isBrowser() && !navigator.onLine) { updateGenerationJob(job.id, { status: "queued", progress: Math.min(job.progress, 20), error: "Waiting for a connection. Your request is safely queued on this device." }); saveActiveId(job.id); }
    else { updateGenerationJob(job.id, { status: "failed", progress: job.progress, error: message }); if (getActiveId() === job.id) saveActiveId(null); }
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally { if (runningJobId === job.id) runningJobId = null; }
}

export function queueLessonGeneration(input: LessonGenerationInput) { const job = createGenerationJob("lesson", input); if (isBrowser() && !navigator.onLine) updateGenerationJob(job.id, { status: "queued", progress: 0, error: "Preparing an offline lesson on this device." }); return job; }
export async function resumeLessonGeneration(token: string | null) { if (!isBrowser() || !token) return null; const active = getActiveGenerationJobs().filter(job => job.kind === "lesson").map(job => job as GenerationJob<LessonGenerationInput>); const preferredId = getActiveId(); const job = (preferredId && active.find(item => item.id === preferredId)) || active[0]; if (!job) return null; if (!navigator.onLine) return saveLocalResult(job); markInterruptedJobsForRetry(); return runJob(job, token); }
export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) { const job = queueLessonGeneration(input); if (isBrowser() && !navigator.onLine) return saveLocalResult(job); if (token && isBrowser()) { void runJob(job, token); return getGenerationJobs().find(item => item.id === job.id) ?? job; } return job; }
function getGenerationJob(id: string) { return getGenerationJobs().find(job => job.id === id) ?? null; }
