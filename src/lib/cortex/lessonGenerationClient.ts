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
function parseLocalModelSection(raw: string): { title?: string; blocks: Array<Record<string, unknown>> } | null {
  try {
    const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(stripped.slice(start, end + 1)) as { title?: unknown; blocks?: unknown };
    if (!Array.isArray(value.blocks)) return null;
    const blocks = value.blocks
      .filter((item): item is Record<string, unknown> =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).type === "string" &&
        typeof (item as Record<string, unknown>).content === "string" &&
        String((item as Record<string, unknown>).content).trim().length >= 30
      )
      .slice(0, 6);
    if (blocks.length < 3) return null;
    return {
      title: typeof value.title === "string" ? value.title.trim().slice(0, 255) : undefined,
      blocks,
    };
  } catch {
    return null;
  }
}

async function tryLocalModel(job: GenerationJob<LessonGenerationInput>, token: string): Promise<LessonGenerationResult | null> {
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
  const sectionCount = request.broadTopic ? 6 : 4;
  const sectionPlan = request.broadTopic
    ? [
        "Orient the learner: define the territory, prerequisites, vocabulary, and why the topic matters.",
        "Teach the first major concepts deeply, including relationships and underlying reasoning.",
        "Teach the next major concepts deeply, including mechanisms, structures, formulas, or processes where relevant.",
        "Connect the ideas with worked examples, applications, comparisons, and step-by-step reasoning.",
        "Handle misconceptions, common mistakes, exam-style thinking, and how to recognise what a question is testing.",
        "Synthesize the whole topic, connect the pieces, add curiosity/application, and give a clear next step.",
      ]
    : [
        "Build the foundation: prerequisites, vocabulary, core idea, and mental model.",
        "Teach the main concepts deeply with explanations, relationships, and a worked example.",
        "Extend the understanding with applications, comparisons, mechanisms/formulas, and common mistakes.",
        "Consolidate with exam/practice thinking, synthesis, checkpoint prompts, and a useful next step.",
      ];

  const allBlocks: Array<Record<string, unknown>> = [];
  let title = request.topic || job.request.prompt;

  for (let index = 0; index < sectionPlan.length; index += 1) {
    const sectionPrompt = `You are generating section ${index + 1} of ${sectionCount} of one coherent lesson.

REQUEST
${resolved}

VERIFIED LOCAL CURRICULUM
${grounding || context || "No verified curriculum data is cached. Do not invent board-specific claims."}

SECTION JOB
${sectionPlan[index]}

ALREADY GENERATED SECTIONS
${allBlocks.slice(-8).map((block) => `${String(block.type)}: ${String(block.content)}`).join("\n") || "None"}

TEACHING CONTRACT
- This is one section of a larger lesson. Do not repeat earlier material unless a short bridge is genuinely useful.
- Stay strictly inside the requested subject and topic.
- Teach rather than summarise. Explain why, how, and when the ideas matter.
- Use student-facing language, concrete examples, and step-by-step reasoning.
- Do not invent syllabus requirements, facts, numerical answers, or citations.
- Checkpoints must ask the learner to think. Do not put the answer in the checkpoint itself.
- Avoid giant paragraphs.

OUTPUT
Return ONLY valid JSON:
{
  "title": "specific overall lesson title",
  "blocks": [
    {
      "type": "map|prior|concept|definition|structure|mechanism|formula|example|checkpoint|comparison|misconception|exam|application|mistake|synthesis|curiosity|practice|summary|next|tip",
      "title": "short heading",
      "content": "substantive student-facing content"
    }
  ]
}

Generate 3-5 substantive blocks for this section. Make the blocks useful on their own while clearly fitting into the whole lesson.

MATH
Every mathematical expression uses single-dollar LaTeX delimiters. Never use caret exponents or ASCII fractions.`;

    try {
      const raw = await generateBrowserLocal(sectionPrompt, undefined, {
        maxTokens: request.broadTopic ? 1400 : 1200,
        json: true,
      });
      const parsed = parseLocalModelSection(raw);
      if (!parsed || parsed.blocks.length < 3) return null;

      if (index === 0 && parsed.title) title = parsed.title;
      const usable = parsed.blocks
        .filter((block) => !allBlocks.some((existing) =>
          String(existing.type) === String(block.type) &&
          String(existing.content).trim() === String(block.content).trim()
        ))
        .slice(0, 6);

      if (usable.length < 3) return null;
      allBlocks.push(...usable);

      const progress = Math.min(75, 20 + Math.round(((index + 1) / sectionCount) * 55));
      updateGenerationJob(job.id, {
        status: "partial",
        progress,
        partial: { title, blocks: allBlocks, completedUnits: index + 1, totalUnits: sectionCount },
      });
      await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "progress");
    } catch (error) {
      console.info("[LEARN] browser-local section failed", {
        section: index + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  const minimumBlocks = request.broadTopic ? 14 : 10;
  if (allBlocks.length < minimumBlocks) return null;

  const candidate: LessonGenerationResult = {
    id: `local-model-${Date.now().toString(36)}`,
    title: title.trim().slice(0, 255),
    blocks: allBlocks,
    localModel: true,
  };

  const quality = lessonQualityFailures({
    title: candidate.title,
    blocks: candidate.blocks.map((block) => ({
      type: String(block.type),
      title: typeof block.title === "string" ? block.title : undefined,
      content: String(block.content),
    })),
  }, request);

  if (quality.failures.length) {
    console.info("[LEARN] browser-local assembled lesson rejected by quality gate", {
      failures: quality.failures,
      topic: request.topic,
    });
    return null;
  }

  return candidate;
}
async function runJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  // One browser job owns one durable identity. Retries and refreshes reuse it.
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id); updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  try {
    rememberLocalTopic(job.request.prompt); updateGenerationJob(job.id, { status: "generating", progress: 15 });
    const localModel = await tryLocalModel(job, token); if (localModel) { const finished = await saveLocalResult(job, localModel); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete"); return finished; }
    if (isBrowser() && !navigator.onLine) { const finished = await saveLocalResult(job); await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete"); return finished; }
    let data: any = null;
    let lastError: unknown = null;
    const request = resolvedRequest(job);
    const sectionCount = request.broadTopic ? 6 : 4;
    let assembledBlocks: Array<Record<string, unknown>> = Array.isArray(job.partial?.blocks) ? [...job.partial.blocks] : [];
    let assembledTitle = request.topic || job.request.prompt;

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
      let sectionData: any = null;
      for (let attempt = 0; attempt < MAX_CLOUD_ATTEMPTS; attempt += 1) {
        const progress = Math.min(88, 20 + Math.round((sectionIndex / sectionCount) * 68) + Math.min(5, attempt));
        updateGenerationJob(job.id, {
          status: "generating",
          progress,
          partial: {
            title: assembledTitle,
            blocks: assembledBlocks,
            completedUnits: sectionIndex,
            totalUnits: sectionCount,
          },
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CLOUD_GENERATION_TIMEOUT_MS);
        try {
          const response = await fetch("/api/learn", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              type: "lesson",
              generationMode: "section",
              generationSectionIndex: sectionIndex,
              generationSectionCount: sectionCount,
              priorBlocks: assembledBlocks.slice(-12),
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
          sectionData = await response.json().catch(() => ({}));
          if (response.ok && Array.isArray(sectionData?.blocks) && sectionData.blocks.length >= 3) break;

          lastError = new Error(sectionData?.error || `Section generation failed (${response.status})`);
          const retryable = response.status === 408 || response.status === 409 || response.status === 422 ||
            response.status === 429 || response.status >= 500;
          if (!retryable || attempt === MAX_CLOUD_ATTEMPTS - 1) throw lastError;
        } catch (error) {
          lastError = error;
          if (!shouldRetry(attempt + 1, MAX_CLOUD_ATTEMPTS)) throw error;
        } finally {
          clearTimeout(timeout);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
      }

      if (!sectionData?.blocks?.length) {
        throw lastError instanceof Error ? lastError : new Error("The lesson section service returned no usable section.");
      }

      if (typeof sectionData.title === "string" && sectionIndex === 0) assembledTitle = sectionData.title;
      assembledBlocks = Array.isArray(sectionData.partialBlocks)
        ? sectionData.partialBlocks
        : [...assembledBlocks, ...sectionData.blocks];

      updateGenerationJob(job.id, {
        status: "partial",
        progress: Math.min(90, 20 + Math.round(((sectionIndex + 1) / sectionCount) * 70)),
        partial: {
          title: assembledTitle,
          blocks: assembledBlocks,
          completedUnits: sectionIndex + 1,
          totalUnits: sectionCount,
        },
      });
      await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "progress");
    }

    data = {
      id: job.id,
      title: assembledTitle,
      blocks: assembledBlocks,
    };
    if (!data?.id || !Array.isArray(data?.blocks)) throw lastError instanceof Error ? lastError : new Error("The lesson service returned an incomplete lesson.");
    updateGenerationJob(job.id, { status: "partial", progress: 92 });
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
