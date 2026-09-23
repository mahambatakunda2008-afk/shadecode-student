import { createGenerationJob, getActiveGenerationJobs, getGenerationJob, getGenerationJobs, markInterruptedJobsForRetry, restoreGenerationJob, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { classifyCortexFailure, retryDelay, shouldRetry } from "@/lib/cortex/faultTolerance";
import { offlineStorage } from "@/lib/offline/storage";
import { generateLocalLesson, hasLocalLessonFallback } from "@/lib/cortex/localLessonGenerator";
import { getLocalCurriculumGrounding, readLocalCurriculumGrounding, readLocalCurriculumGroundingData } from "@/lib/cortex/localCurriculumGrounding";
import { readOfflineCurriculumPack, buildOfflineCurriculumScope } from "@/lib/cortex/offlineCurriculumPack";
import { readLocalLearnerMemory, buildLocalLearnerContext, rememberLocalTopic } from "@/lib/cortex/localLearnerMemory";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { lessonQualityFailures } from "@/lib/cortex/lessonQuality";
import { normalizeLessonBlocks } from "@/lib/learn/mathNotation";
import { isBroadTopic } from "@/lib/learn/curriculumPlanner";
import type { GenerationJobStatus } from "@/lib/cortex/generationJob";
import { listDurableGenerationJobs, syncDurableGenerationJob } from "@/lib/cortex/durableGenerationJob";
import { generateBrowserLocal, isBrowserLocalModelAvailable } from "@/lib/cortex/localModel";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; localModel?: boolean; }
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
const CLOUD_GENERATION_TIMEOUT_MS = 55_000;
const MAX_CLOUD_ATTEMPTS = 3;
const LOCAL_MODEL_TIMEOUT_MS = 30_000;
const LOCAL_MODEL_BASE_URL = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_BASE_URL?.trim()) || "";
const LOCAL_MODEL_NAME = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OLLAMA_MODEL) || "qwen2.5:7b";
let runningJobId: string | null = null;
function isBrowser() { return typeof window !== "undefined"; }
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
function openCompletedLesson(result: LessonGenerationResult) { if (!isBrowser() || window.location.pathname !== "/learn") return; window.location.assign(`/learn/${encodeURIComponent(result.id)}`); }
function resolvedRequest(job: GenerationJob<LessonGenerationInput>) {
  const request = resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject, level: job.request.level, difficulty: job.request.difficulty, goal: job.request.goal, examBoard: job.request.examBoard });
  const grounding = readLocalCurriculumGroundingData(job.request.subject, request.topic);
  if (grounding?.resolvedTopic && grounding.resolvedTopic.trim()) request.topic = grounding.resolvedTopic.trim();
  request.broadTopic = request.broadTopic || isBroadTopic(request.topic);
  if (request.broadTopic) request.depth = "deep";
  return request;
}
function localContext(job: GenerationJob<LessonGenerationInput>) {
  const request = resolvedRequest(job);
  const pack = readOfflineCurriculumPack(job.request.subject, job.request.examBoard, job.request.level);
  const cachedGrounding = readLocalCurriculumGrounding(job.request.subject, request.topic) || readLocalCurriculumGrounding(job.request.subject, resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject }).topic);
  const curriculum = buildOfflineCurriculumScope(pack, request.topic);
  const memory = buildLocalLearnerContext(readLocalLearnerMemory());
  return `${cachedGrounding ? `\n\n${cachedGrounding}` : ""}${curriculum ? `\n\n${curriculum}` : ""}\n\n${memory}`;
}
function validateResult(result: LessonGenerationResult, request: ReturnType<typeof resolveLessonRequest>) {
  const normalized = normalizeLessonBlocks(result.blocks);
  const quality = lessonQualityFailures({ title: result.title, blocks: normalized.map((block) => ({ type: String(block.type), title: typeof block.title === "string" ? block.title : undefined, content: String(block.content ?? "") })) }, request);
  if (quality.failures.length) {
    console.info("[LEARN] lesson rejected by client quality gate", { failures: quality.failures, topic: request.topic });
    return null;
  }
  return { ...result, blocks: normalized };
}
async function saveLocalResult(job: GenerationJob<LessonGenerationInput>, generated?: LessonGenerationResult) {
  const context = localContext(job);
  const request = resolvedRequest(job);
  const local = generated ?? generateLocalLesson(job.request.subject, job.request.prompt, context);
  const validated = validateResult(local, request);
  if (!validated) throw new Error("Generated lesson failed the learning-quality checks.");
  const result: LessonGenerationResult = { id: validated.id, title: validated.title, blocks: validated.blocks, offlineFallback: !generated?.localModel, localModel: !!generated?.localModel };
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
    const blocks = value.blocks.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && typeof (item as Record<string, unknown>).type === "string" && typeof (item as Record<string, unknown>).content === "string" && String((item as Record<string, unknown>).content).trim().length >= 30).slice(0, 24);
    if (blocks.length < 8) return null;
    const types = new Set(blocks.map(item => String(item.type).toLowerCase()));
    if (!(types.has("objective") && (types.has("concept") || types.has("definition")) && types.has("example") && types.has("checkpoint") && types.has("summary"))) return null;
    return { id: `local-model-${Date.now().toString(36)}`, title: value.title.trim().slice(0, 255), blocks, localModel: true };
  } catch { return null; }
}
async function tryLocalModel(job: GenerationJob<LessonGenerationInput>): Promise<LessonGenerationResult | null> {
  if (!isBrowser()) return null;

  const request = resolveLessonRequest({
    prompt: job.request.prompt,
    subject: job.request.subject,
    level: job.request.level,
    difficulty: job.request.difficulty,
    goal: job.request.goal,
    examBoard: job.request.examBoard,
  });

  const grounding = await getLocalCurriculumGrounding(job.request.subject, request.topic);
  const groundingData = readLocalCurriculumGroundingData(job.request.subject, request.topic);
  if (groundingData?.resolvedTopic) request.topic = groundingData.resolvedTopic;
  request.broadTopic = request.broadTopic || isBroadTopic(request.topic);
  if (request.broadTopic) request.depth = "deep";

  const context = localContext(job);
  const resolved = buildResolvedLessonPrompt(request);
  const prompt = `You are Cortex, the local teaching engine inside Shadecode Student.

Generate a real teaching lesson, not a generic AI answer.

REQUEST
${resolved}

VERIFIED LOCAL CURRICULUM
${grounding || context || "No verified curriculum data is cached. Do not invent board-specific claims."}

TEACHING CONTRACT
- Stay on the requested subject and topic.
- Teach the topic substantively and coherently.
- For broad topics, map the territory and teach the major branches rather than summarising them.
- Use learner context only to adapt sequencing and emphasis, never as curriculum authority.
- Explain ideas before testing them.
- Include worked reasoning where appropriate.
- Checkpoints must not reveal their answers.
- Do not invent syllabus claims, fake exam questions, or unexplained numerical results.
- Avoid wall-of-text paragraphs.

OUTPUT
Return ONLY valid JSON:
{
  "title": "specific lesson title",
  "blocks": [
    {
      "type": "objective|map|prior|concept|definition|structure|mechanism|formula|example|checkpoint|comparison|misconception|exam|application|mistake|synthesis|curiosity|practice|summary|next|tip",
      "title": "short heading",
      "content": "student-facing content"
    }
  ]
}

Use 8-14 substantive blocks for a standard request and 14-20 for a broad/deep request. A normal teaching lesson should contain an objective, explanation, worked example, checkpoint, synthesis/summary, and useful next step where appropriate.

MATH
Every mathematical expression uses single-dollar LaTeX delimiters. Never use caret exponents or ASCII fractions.`;

  try {
    if (!(await isBrowserLocalModelAvailable())) return null;

    const raw = await generateBrowserLocal(prompt, undefined, {
      maxTokens: request.broadTopic ? 3000 : 2200,
      json: true,
    });

    const parsed = parseLocalModelLesson(raw);
    if (!parsed) return null;

    const quality = lessonQualityFailures({
      title: parsed.title,
      blocks: parsed.blocks.map((block) => ({
        type: String(block.type),
        title: typeof block.title === "string" ? block.title : undefined,
        content: String(block.content),
      })),
    }, request);

    if (quality.failures.length) {
      console.info("[LEARN] browser-local lesson rejected by quality gate", {
        failures: quality.failures,
        topic: request.topic,
      });
      return null;
    }

    return parsed;
  } catch (error) {
    console.info(
      "[LEARN] browser-local model unavailable",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  // One browser job owns one durable identity. Retries and refreshes reuse it.
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id); updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  try {
    rememberLocalTopic(job.request.prompt); updateGenerationJob(job.id, { status: "generating", progress: 15 });
    const localModel = await tryLocalModel(job); if (localModel) { const finished = await saveLocalResult(job, localModel); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete"); return finished; }
    if (isBrowser() && !navigator.onLine) { const finished = await saveLocalResult(job); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete"); return finished; }
    let data: any = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_CLOUD_ATTEMPTS; attempt++) {
      updateGenerationJob(job.id, { status: "generating", progress: Math.min(70, 20 + attempt * 10) });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CLOUD_GENERATION_TIMEOUT_MS);
      try {
        const response = await fetch("/api/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: "lesson",
            subject: job.request.subject,
            topic: job.request.prompt,
            difficulty: job.request.difficulty,
            goal: job.request.goal,
            level: job.request.level,
            examBoard: job.request.examBoard,
            generationJobId: job.id,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        data = await response.json().catch(() => ({}));
        if (response.ok && !data?.error) updateGenerationJob(job.id, { status: "partial", progress: 75 });
        if (response.ok && !data?.error) break;
        const retryable = response.status === 408 || response.status === 409 || response.status === 422 || response.status === 429 || response.status >= 500;
        lastError = new Error(data?.error || `Generation failed (${response.status})`);
        if (!retryable || attempt === MAX_CLOUD_ATTEMPTS - 1) throw lastError;
      } catch (error) {
        lastError = error;
        if (!shouldRetry(attempt + 1, MAX_CLOUD_ATTEMPTS)) throw error;
      } finally {
        clearTimeout(timeout);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
    }
    if (!data?.id || !Array.isArray(data?.blocks)) throw lastError instanceof Error ? lastError : new Error("The lesson service returned an incomplete lesson.");
    updateGenerationJob(job.id, { status: "partial", progress: 82 });
    const request = resolvedRequest(job);
    const result = validateResult({ id: data.id, title: data.title || request.topic || job.request.prompt, blocks: data.blocks }, request);
    if (!result) throw new Error("The lesson service returned a lesson that failed the learning-quality checks.");
    updateGenerationJob(job.id, { status: "partial", progress: 92, partial: { title: result.title, blocks: result.blocks } });
    const now = new Date().toISOString();
    await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: `A complete ${job.request.difficulty} lesson on ${request.topic}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
    updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined }); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "complete"); if (getActiveId() === job.id) saveActiveId(null); openCompletedLesson(result); return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } catch (error) {
    const message = errorMessage(error); const context = localContext(job);
    if (isBrowser() && hasLocalLessonFallback(job.request.subject, job.request.prompt, context)) {
      try {
        return await saveLocalResult(job);
      } catch (fallbackError) {
        console.warn("[LEARN] local fallback was available but failed its quality gate", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }
    if (isBrowser() && !navigator.onLine) {
      updateGenerationJob(job.id, { status: "queued", progress: 20, error: "Waiting for a connection." });
      saveActiveId(job.id);
    } else if (shouldRetry(job.retryCount, 5)) {
      const retryCount = job.retryCount + 1;
      const failureClass = classifyCortexFailure(error);
      updateGenerationJob(job.id, { status: "queued", progress: Math.min(90, Math.max(20, job.progress)), retryCount, error: `Cortex hit a ${failureClass} generation failure. Retrying automatically (attempt ${retryCount + 1}/6)…` });
      saveActiveId(job.id);
      setTimeout(() => {
        if (getGenerationJob(job.id)?.status === "queued") void runJob(getGenerationJob(job.id) as GenerationJob<LessonGenerationInput>, token);
      }, retryDelay(retryCount));
    } else {
      updateGenerationJob(job.id, { status: "failed", progress: job.progress, error: `${message} Cortex exhausted its automatic recovery attempts. Your request is still safe to retry.` }); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "failed");
      if (getActiveId() === job.id) saveActiveId(null);
    }
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally { if (runningJobId === job.id) runningJobId = null; }
}
export function queueLessonGeneration(input: LessonGenerationInput) { return createGenerationJob("lesson", input); }
export async function resumeLessonGeneration(token: string | null) { if (!isBrowser() || !token) return null; let active = getActiveGenerationJobs().filter(job => job.kind === "lesson").map(job => job as GenerationJob<LessonGenerationInput>); const preferredId = getActiveId(); let job = (preferredId && active.find(item => item.id === preferredId)) || active[0]; if (!job) { const durable = await listDurableGenerationJobs(token); const remote = durable.find((item) => { const row = item as Record<string, unknown>; return row.kind === "lesson" && row.request && typeof row.request === "object"; }) as Record<string, unknown> | undefined; if (remote) { const restored: GenerationJob<LessonGenerationInput> = { id: String(remote.id), kind: "lesson", status: String(remote.status) as GenerationJobStatus, request: remote.request as LessonGenerationInput, result: remote.result, partial: remote.partial, progress: typeof remote.progress === "number" ? remote.progress : 0, createdAt: Date.parse(String(remote.created_at ?? "")) || Date.now(), updatedAt: Date.parse(String(remote.updated_at ?? "")) || Date.now(), error: remote.error && typeof remote.error === "object" ? String((remote.error as Record<string, unknown>).message ?? "") : undefined, retryCount: typeof remote.retry_count === "number" ? remote.retry_count : 0 }; job = restoreGenerationJob(restored); } } if (!job) return null; markInterruptedJobsForRetry(); return runJob(job, token); }
export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) { const job = queueLessonGeneration(input); if (token && isBrowser()) { void syncDurableGenerationJob(token, job, "created"); void runJob(job, token); return getGenerationJobs().find(item => item.id === job.id) ?? job; } if (isBrowser()) return saveLocalResult(job); return job; }
