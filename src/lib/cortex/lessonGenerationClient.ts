import { createGenerationJob, getActiveGenerationJobs, getGenerationJobs, markInterruptedJobsForRetry, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { offlineStorage } from "@/lib/offline/storage";
import { generateLocalLesson, hasLocalLessonFallback } from "@/lib/cortex/localLessonGenerator";
import { getLocalCurriculumGrounding, readLocalCurriculumGrounding } from "@/lib/cortex/localCurriculumGrounding";
import { readOfflineCurriculumPack, buildOfflineCurriculumScope } from "@/lib/cortex/offlineCurriculumPack";
import { readLocalLearnerMemory, buildLocalLearnerContext, rememberLocalTopic } from "@/lib/cortex/localLearnerMemory";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; localModel?: boolean; }
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
const CLOUD_GENERATION_TIMEOUT_MS = 82_000;
const LOCAL_MODEL_TIMEOUT_MS = 30_000;
const LOCAL_MODEL_BASE_URL = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_BASE_URL) || "http://127.0.0.1:11434";
const LOCAL_MODEL_NAME = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_MODEL) || "qwen2.5:7b";
let runningJobId: string | null = null;
function isBrowser() { return typeof window !== "undefined"; }
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
function openCompletedLesson(result: LessonGenerationResult) { if (!isBrowser() || window.location.pathname !== "/learn") return; window.location.assign(`/learn/${encodeURIComponent(result.id)}`); }
function localContext(job: GenerationJob<LessonGenerationInput>) {
  const pack = readOfflineCurriculumPack(job.request.subject, job.request.examBoard, job.request.level);
  const request = resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject, level: job.request.level, difficulty: job.request.difficulty, goal: job.request.goal, examBoard: job.request.examBoard });
  const cachedGrounding = readLocalCurriculumGrounding(job.request.subject, request.topic);
  const curriculum = buildOfflineCurriculumScope(pack, request.topic);
  const memory = buildLocalLearnerContext(readLocalLearnerMemory());
  return `${cachedGrounding ? `\n\n${cachedGrounding}` : ""}${curriculum ? `\n\n${curriculum}` : ""}\n\n${memory}`;
}
async function saveLocalResult(job: GenerationJob<LessonGenerationInput>, generated?: LessonGenerationResult) {
  const context = localContext(job);
  const local = generated ?? generateLocalLesson(job.request.subject, job.request.prompt, context);
  const result: LessonGenerationResult = { id: local.id, title: local.title, blocks: local.blocks, offlineFallback: !generated?.localModel, localModel: !!generated?.localModel };
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: generated?.localModel ? `Locally generated Cortex lesson for ${job.request.prompt}` : `Offline curriculum lesson for ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
  updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined });
  if (getActiveId() === job.id) saveActiveId(null); openCompletedLesson(result);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}
function parseLocalModelLesson(raw: string): LessonGenerationResult | null {
  try {
    const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const start = stripped.indexOf("{"); const end = stripped.lastIndexOf("}"); if (start < 0 || end <= start) return null;
    const value = JSON.parse(stripped.slice(start, end + 1)) as { title?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && typeof (item as Record<string, unknown>).type === "string" && typeof (item as Record<string, unknown>).content === "string" && String((item as Record<string, unknown>).content).trim().length >= 30).slice(0, 16);
    if (blocks.length < 8) return null;
    const types = new Set(blocks.map(item => String(item.type).toLowerCase()));
    if (!(types.has("objective") && (types.has("concept") || types.has("definition")) && types.has("example") && types.has("checkpoint") && types.has("summary"))) return null;
    return { id: `local-model-${Date.now().toString(36)}`, title: value.title.trim().slice(0, 255), blocks, localModel: true };
  } catch { return null; }
}
async function tryLocalModel(job: GenerationJob<LessonGenerationInput>): Promise<LessonGenerationResult | null> {
  if (!isBrowser()) return null;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), LOCAL_MODEL_TIMEOUT_MS);
  try {
    const request = resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject, level: job.request.level, difficulty: job.request.difficulty, goal: job.request.goal, examBoard: job.request.examBoard });
    const grounding = await getLocalCurriculumGrounding(job.request.subject, request.topic);
    const cachedContext = localContext(job);
    const resolved = buildResolvedLessonPrompt(request);
    const curriculum = grounding || cachedContext;
    const prompt = `You are the local Cortex teaching engine for Shadecode Student. Return ONLY JSON.\n\n${resolved}\n\nLOCAL CURRICULUM DATA\n${curriculum || "No verified curriculum data is cached. Do not claim board-specific alignment or invent syllabus content."}\n\nLOCAL GENERATION RULES\n- Follow the interpreted intent exactly. Do not substitute your own lesson goal.\n- Teach the requested topic, not the entire surrounding subject.\n- Use only the supplied curriculum/knowledge data for curriculum-specific claims.\n- Learner memory may change sequencing or practice emphasis, but it is not curriculum authority.\n- Do not add arbitrary application, exam, proof, misconception or formula sections when they are not useful for this request.\n- Never invent an unexplained numerical result or a fake past-paper question.\n- If the supplied data does not support a factual claim, omit the claim rather than guessing.\n- Make the lesson feel like a coherent tutor session, not a data dump.\n\nFORMAT\nCreate 8-14 purposeful blocks. Use objective, prior, concept, definition, formula, example, checkpoint, comparison, misconception, exam, application, mistake, practice, summary or tip as appropriate. A teach request normally needs an objective, explanation, one worked example, a checkpoint and a concise summary. A practice request needs questions. A comparison needs an explicit comparison. A remedial request needs diagnosis and correction. Do not force unused block types.\n\nPRESENTATION\nNo wall-of-text paragraphs. Use short lines. One distinct idea per line. Use '- ' for lists and numbered lines for reasoning. Worked examples use Given:, Method:, Step 1:, Step 2:, Answer: on separate lines. Checkpoints use Question: and Think: on separate lines and do not reveal the answer in the checkpoint. Formulas get their own lines. Avoid internal-template headings.\n\nJSON SCHEMA\n{"title":"specific topic-and-outcome title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|application|mistake|practice|summary|tip","title":"short content-specific heading","content":"student-facing content"}]}`;
    const response = await fetch(`${LOCAL_MODEL_BASE_URL.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: LOCAL_MODEL_NAME, messages: [{ role: "user", content: prompt }], stream: false, format: "json", options: { temperature: 0.2, num_predict: 4200 } }), signal: controller.signal });
    if (!response.ok) throw new Error(`Local model HTTP ${response.status}`);
    const data = await response.json() as { message?: { content?: unknown } };
    return typeof data?.message?.content === "string" ? parseLocalModelLesson(data.message.content) : null;
  } catch (error) { console.info("[LEARN] local model unavailable", error instanceof Error ? error.message : String(error)); return null; }
  finally { clearTimeout(timer); }
}
async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id); updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  try {
    rememberLocalTopic(job.request.prompt); updateGenerationJob(job.id, { status: "generating", progress: 12 });
    const localModel = await tryLocalModel(job); if (localModel) return saveLocalResult(job, localModel);
    if (isBrowser() && !navigator.onLine) return saveLocalResult(job);
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), CLOUD_GENERATION_TIMEOUT_MS);
    const response = await fetch("/api/learn/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: "lesson", subject: job.request.subject, prompt: job.request.prompt, difficulty: job.request.difficulty, goal: job.request.goal, level: job.request.level, examBoard: job.request.examBoard }), cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timeout));
    const data = await response.json().catch(() => ({})); if (!response.ok || data?.error) throw new Error(data?.error || `Generation failed (${response.status})`);
    if (!data?.id || !Array.isArray(data?.blocks)) throw new Error("The lesson service returned an incomplete lesson.");
    const result: LessonGenerationResult = { id: data.id, title: data.title || job.request.prompt, blocks: data.blocks }; const now = new Date().toISOString();
    await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `A complete ${job.request.difficulty} lesson on ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
    updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined }); if (getActiveId() === job.id) saveActiveId(null); openCompletedLesson(result); return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } catch (error) {
    const message = errorMessage(error); const context = localContext(job);
    if (isBrowser() && hasLocalLessonFallback(job.request.subject, job.request.prompt, context)) return saveLocalResult(job);
    if (isBrowser() && !navigator.onLine) { updateGenerationJob(job.id, { status: "queued", progress: 20, error: "Waiting for a connection." }); saveActiveId(job.id); }
    else { updateGenerationJob(job.id, { status: "failed", progress: job.progress, error: message }); if (getActiveId() === job.id) saveActiveId(null); }
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally { if (runningJobId === job.id) runningJobId = null; }
}
export function queueLessonGeneration(input: LessonGenerationInput) { return createGenerationJob("lesson", input); }
export async function resumeLessonGeneration(token: string | null) { if (!isBrowser() || !token) return null; const active = getActiveGenerationJobs().filter(job => job.kind === "lesson").map(job => job as GenerationJob<LessonGenerationInput>); const preferredId = getActiveId(); const job = (preferredId && active.find(item => item.id === preferredId)) || active[0]; if (!job) return null; markInterruptedJobsForRetry(); return runJob(job, token); }
export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) { const job = queueLessonGeneration(input); if (token && isBrowser()) { void runJob(job, token); return getGenerationJobs().find(item => item.id === job.id) ?? job; } if (isBrowser()) return saveLocalResult(job); return job; }
