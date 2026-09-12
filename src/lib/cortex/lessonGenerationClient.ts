import { createGenerationJob, getActiveGenerationJobs, getGenerationJobs, markInterruptedJobsForRetry, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { offlineStorage } from "@/lib/offline/storage";
import { generateLocalLesson, hasLocalLessonFallback } from "@/lib/cortex/localLessonGenerator";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; localModel?: boolean; }
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
const CLOUD_GENERATION_TIMEOUT_MS = 82_000;
const LOCAL_MODEL_TIMEOUT_MS = 8_000;
const LOCAL_MODEL_BASE_URL = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_BASE_URL) || "http://127.0.0.1:11434";
const LOCAL_MODEL_NAME = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_MODEL) || "qwen2.5:7b";
let runningJobId: string | null = null;
function isBrowser() { return typeof window !== "undefined"; }
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
function openCompletedLesson(result: LessonGenerationResult) { if (!isBrowser() || window.location.pathname !== "/learn") return; window.location.assign(`/learn/${encodeURIComponent(result.id)}`); }

async function saveLocalResult(job: GenerationJob<LessonGenerationInput>, generated?: LessonGenerationResult) {
  const local = generated ?? generateLocalLesson(job.request.subject, job.request.prompt);
  const result: LessonGenerationResult = { id: local.id, title: local.title, blocks: local.blocks, offlineFallback: !generated?.localModel, localModel: !!generated?.localModel };
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `Local study session for ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
  updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined });
  if (getActiveId() === job.id) saveActiveId(null);
  openCompletedLesson(result);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}

function parseLocalModelLesson(raw: string, job: GenerationJob<LessonGenerationInput>): LessonGenerationResult | null {
  try {
    const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(stripped.slice(start, end + 1)) as { title?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((block): block is Record<string, unknown> => {
      if (!block || typeof block !== "object") return false;
      const item = block as Record<string, unknown>;
      return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 30;
    }).slice(0, 18);
    if (blocks.length < 10) return null;
    return { id: `local-model-${Date.now().toString(36)}`, title: value.title.trim().slice(0, 255), blocks, localModel: true };
  } catch { return null; }
}

async function tryLocalModel(job: GenerationJob<LessonGenerationInput>): Promise<LessonGenerationResult | null> {
  if (!isBrowser() || !navigator.onLine) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOCAL_MODEL_TIMEOUT_MS);
  try {
    const prompt = `You are the local Cortex teaching model for Shadecode Student. Return ONLY JSON.\nSubject: ${job.request.subject}\nLevel: ${job.request.level || "not specified"}\nExam board: ${job.request.examBoard || "not specified"}\nDifficulty: ${job.request.difficulty}\nGoal: ${job.request.goal}\nTopic/request: ${job.request.prompt}\n\nCreate 10-16 structured learning blocks. Use types objective, prior, concept, definition, formula, example, checkpoint, misconception, exam, application, mistake, practice, summary, tip. No wall-of-text. Use short newline-separated learning units. Worked examples must have Given:, Method:, Step 1:, Step 2:, Answer:. Checkpoints must have Question: and Think:. Exam transfer must have Question:, Approach:, Examiner looks for:. Do not invent official syllabus claims. If board-specific facts are uncertain, teach the topic generally. JSON shape: {"title":"...","blocks":[{"type":"...","title":"...","content":"..."}]}`;
    const response = await fetch(`${LOCAL_MODEL_BASE_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: LOCAL_MODEL_NAME, messages: [{ role: "user", content: prompt }], stream: false, format: "json", options: { temperature: 0.25, num_predict: 4200 } }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Local model HTTP ${response.status}`);
    const data = await response.json() as any;
    return typeof data?.message?.content === "string" ? parseLocalModelLesson(data.message.content, job) : null;
  } catch (error) {
    console.info("[LEARN] local model unavailable; continuing with cloud generation", error instanceof Error ? error.message : String(error));
    return null;
  } finally { clearTimeout(timer); }
}

async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id);
  updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  try {
    updateGenerationJob(job.id, { status: "generating", progress: 12 });

    // Local-first: when Ollama is installed and a model is already available, Cortex can
    // generate without consuming cloud AI at all. A missing local server costs only one short timeout.
    const localModel = await tryLocalModel(job);
    if (localModel) {
      console.info("[LEARN] lesson generated by local Ollama model", { model: LOCAL_MODEL_NAME, subject: job.request.subject, topic: job.request.prompt });
      return saveLocalResult(job, localModel);
    }

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
    if (isBrowser() && navigator.onLine && hasLocalLessonFallback(job.request.subject, job.request.prompt)) {
      console.warn("[LEARN] cloud generation unavailable; opening offline-safe local study session", { subject: job.request.subject, topic: job.request.prompt, error: message });
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
