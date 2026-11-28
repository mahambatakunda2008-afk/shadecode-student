import { createGenerationJob, getActiveGenerationJobs, getGenerationJob, getGenerationJobs, markInterruptedJobsForRetry, restoreGenerationJob, retryGenerationJob, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { offlineStorage } from "@/lib/offline/storage";
import { generateLocalLesson, hasLocalLessonFallback } from "@/lib/cortex/localLessonGenerator";
import { getLocalCurriculumGrounding, readLocalCurriculumGrounding, readLocalCurriculumGroundingData } from "@/lib/cortex/localCurriculumGrounding";
import { readOfflineCurriculumPack, buildOfflineCurriculumScope } from "@/lib/cortex/offlineCurriculumPack";
import { readLocalLearnerMemory, buildLocalLearnerContext, rememberLocalTopic } from "@/lib/cortex/localLearnerMemory";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { ensureRequiredDiagram, lessonQualityFailures } from "@/lib/cortex/lessonQuality";
import { normalizeLessonBlocks } from "@/lib/learn/mathNotation";
import { isBroadTopic } from "@/lib/learn/curriculumPlanner";
import type { GenerationJobStatus } from "@/lib/cortex/generationJob";
import { getDurableGenerationJob, listDurableGenerationJobs, syncDurableGenerationJob } from "@/lib/cortex/durableGenerationJob";
import { generateBrowserLocal, getBrowserLocalModelStatus, isBrowserLocalModelAvailable, subscribeBrowserLocalModelStatus } from "@/lib/cortex/localModel";
import { chooseHybridExecutionMode } from "@/lib/cortex/hybridRuntime";
import { classifyCortexExecutionFailure } from "@/lib/cortex/runtime/executionEvents";
import { getCortexRecoveryPolicy } from "@/lib/cortex/runtime/recovery";
import { hasCompletedLessonCheckpoint } from "@/lib/cortex/lessonCheckpoint";
import { buildLocalSectionRequirements } from "@/lib/cortex/localLessonPlan";
import { buildDeterministicLessonFallback } from "@/lib/cortex/lessonFallback";
import { shouldUseFastVerifiedCurriculumRecovery } from "@/lib/cortex/lessonGenerationPolicy";
import { buildPresentationGuidance } from "@/lib/learn/presentationGuidance";
import { getLearningMode } from "@/lib/learningMode";
import { buildResearchMemoryContext } from "@/lib/shadenet/research-memory";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; localModel?: boolean; localOnly?: boolean; source?: "public-web-search" | "shared-library" | "verified-syllabus-guide" | "authored-local"; }
function isLocalOnlyCompletion(value: { localOnly?: boolean; result?: unknown }): boolean {
  const result = value.result;
  if (result && typeof result === "object" && "localOnly" in result) {
    return Boolean((result as { localOnly?: boolean }).localOnly);
  }
  return Boolean(value.localOnly);
}
const ACTIVE_KEY = "shadecode:cortex:lesson-runner:v1";
// /api/learn declares a 90-second serverless limit. Leave an 18-second buffer
// so the client can checkpoint and enter Cortex recovery before the function expires.
const CLOUD_GENERATION_TIMEOUT_MS = 72_000;
// The server owns section repair. The browser must not duplicate that retry loop.
const MAX_CLOUD_ATTEMPTS = 1;
let runningJobId: string | null = null;
const generationLeaseIds = new Map<string, string>();
function generationLeaseId(jobId: string) {
  const existing = generationLeaseIds.get(jobId);
  if (existing) return existing;
  const id = isBrowser() && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `lease-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  generationLeaseIds.set(jobId, id);
  return id;
}

/** Checkpoints title an unfinished lesson "Cortex is building ..."; never let that shell title reach the finished lesson. */
export function finalLessonTitle(title: string | undefined, topic: string): string {
  const cleaned = (title ?? "").trim();
  if (!cleaned || /^cortex is building\b/i.test(cleaned)) return topic.trim().slice(0, 120) || "Lesson";
  return cleaned;
}

async function heartbeatGenerationLease(token: string, jobId: string, leaseId: string): Promise<"ok" | "lost" | "unknown"> {
  try {
    const response = await fetch("/api/cortex/generation", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: jobId,
        leaseId,
        heartbeatOnly: true,
      }),
      cache: "no-store",
    });
    if (response.ok) return "ok";
    if (response.status === 409) return "lost";
    return "unknown";
  } catch {
    return "unknown";
  }
}
function isBrowser() { return typeof window !== "undefined"; }
/** A lesson from the shared library that covers the request, or null. Never throws and never waits long. */
async function fetchLibraryRecovery(subject: string, topic: string, endpoint = "/api/library/recover", timeoutMs = 6000, token?: string): Promise<{ title: string; blocks: Array<Record<string, unknown>>; source: "public-web-search" | "shared-library" | "verified-syllabus-guide" } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${endpoint}?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`, {
      signal: controller.signal,
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: unknown; code?: unknown } | null;
      console.info("[LEARN] recovery endpoint returned no lesson", {
        endpoint,
        status: response.status,
        code: typeof payload?.code === "string" ? payload.code : undefined,
        error: typeof payload?.error === "string" ? payload.error.slice(0, 240) : undefined,
        subject,
        topic,
      });
      return null;
    }
    const data = (await response.json()) as { lesson?: { title?: string; blocks?: Array<Record<string, unknown>>; source?: string } };
    const lesson = data.lesson;
    if (lesson?.title && Array.isArray(lesson.blocks) && lesson.blocks.length >= 4) {
      return { title: lesson.title, blocks: lesson.blocks, source: endpoint === "/api/learn/research" ? "public-web-search" : endpoint === "/api/library/guide" ? "verified-syllabus-guide" : "shared-library" };
    }
    console.info("[LEARN] recovery endpoint returned an unusable lesson payload", {
      endpoint,
      subject,
      topic,
      hasTitle: Boolean(lesson?.title),
      blockCount: Array.isArray(lesson?.blocks) ? lesson.blocks.length : 0,
    });
    return null;
  } catch (error) {
    console.info("[LEARN] recovery endpoint request failed", {
      endpoint,
      subject,
      topic,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
async function syncCompletedGenerationBestEffort(token: string, job: GenerationJob) {
  // The lesson row and learner-visible result are already durable at this point.
  // A secondary generation-job sync failure must not turn success into a retry,
  // which could make the learner generate or save the same lesson again.
  try {
    await syncDurableGenerationJob(token, job, "complete");
  } catch (error) {
    console.warn("[LEARN] lesson completed but durable generation-job sync failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
async function runLocalRecoveryWithHeartbeat<T>(job: GenerationJob<LessonGenerationInput>, token: string, task: () => Promise<T>): Promise<T> {
  const leaseId = generationLeaseId(job.id);
  let leaseLost = false;
  const heartbeatTimer = setInterval(() => {
    void (async () => {
      const heartbeat = await heartbeatGenerationLease(token, job.id, leaseId);
      if (heartbeat === "lost") leaseLost = true;
    })();
  }, 20_000);
  try {
    const result = await task();
    if (leaseLost) throw new Error("CORTEX_LEASE_CONFLICT");
    return result;
  } finally {
    clearInterval(heartbeatTimer);
  }
}
function openCompletedLesson(result: LessonGenerationResult) {
  // A device-only lesson has no guaranteed cloud detail row. Keep the learner on Learn
  // so the explicit local-only status and the offline library remain available.
  if (result.localOnly || !isBrowser() || window.location.pathname !== "/learn") return;
  window.location.assign(`/learn/${encodeURIComponent(result.id)}`);
}
function resolvedRequest(job: GenerationJob<LessonGenerationInput>) {
  const request = resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject, level: job.request.level, difficulty: job.request.difficulty, goal: job.request.goal, examBoard: job.request.examBoard });
  const grounding = readLocalCurriculumGroundingData(job.request.subject, request.topic);
  if (grounding?.resolvedTopic && grounding.resolvedTopic.trim()) request.topic = grounding.resolvedTopic.trim();
  request.broadTopic = request.broadTopic || isBroadTopic(request.topic);
  if (request.broadTopic) request.depth = "deep";
  return request;
}
async function localContext(job: GenerationJob<LessonGenerationInput>): Promise<string> {
  const request = resolvedRequest(job);
  const pack = readOfflineCurriculumPack(job.request.subject, job.request.examBoard, job.request.level);
  const cachedGrounding = readLocalCurriculumGrounding(job.request.subject, request.topic) || readLocalCurriculumGrounding(job.request.subject, resolveLessonRequest({ prompt: job.request.prompt, subject: job.request.subject }).topic);
  const curriculum = buildOfflineCurriculumScope(pack, request.topic);
  const learnerMemory = buildLocalLearnerContext(readLocalLearnerMemory());
  const researchMemory = await buildResearchMemoryContext(request.topic, job.request.subject, 4).catch(() => "");
  return `${cachedGrounding ? `\n\n${cachedGrounding}` : ""}${curriculum ? `\n\n${curriculum}` : ""}\n\n${learnerMemory}${researchMemory ? `\n\n${researchMemory.slice(0, 6000)}` : ""}`;
}

async function readCrossDeviceLearnerMemory(token: string, subject: string, topic: string): Promise<string> {
  if (!token || !isBrowser() || !navigator.onLine) return "";
  try {
    const params = new URLSearchParams({ subject, topic });
    const response = await fetch(`/api/learn/memory?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return "";
    const data = await response.json().catch(() => ({}));
    return typeof data.context === "string" ? data.context.slice(0, 1800) : "";
  } catch {
    return "";
  }
}
function validateResult(result: LessonGenerationResult, request: ReturnType<typeof resolveLessonRequest>) {
  const normalized = normalizeLessonBlocks(result.blocks);
  // A server-selected curated curriculum lesson has already passed exact subject/topic
  // matching. Do not apply AI-generation depth heuristics to it: those heuristics require
  // extra checkpoints/continuation blocks and used to discard valid recovery lessons.
  if (result.offlineFallback) return { ...result, blocks: normalized };
  const quality = lessonQualityFailures({ title: result.title, blocks: normalized.map((block) => ({ type: String(block.type), title: typeof block.title === "string" ? block.title : undefined, content: String(block.content ?? "") })) }, request);
  if (quality.failures.length) {
    console.info("[LEARN] lesson rejected by client quality gate", { failures: quality.failures.join(","), topic: request.topic, blocks: normalized.length });
    return null;
  }
  return { ...result, blocks: normalized };
}
async function saveLocalResult(job: GenerationJob<LessonGenerationInput>, generated?: LessonGenerationResult) {
  const { createClient } = await import("@/lib/supabase/client");
  const { data: sessionData } = await createClient().auth.getSession();
  const ownerUserId = sessionData.session?.user.id;
  if (!ownerUserId) throw new Error("Sign in on this device before saving a private offline lesson.");
  const context = await localContext(job);
  const request = resolvedRequest(job);
  const local = generated ?? generateLocalLesson(job.request.subject, job.request.prompt, context, { board: job.request.examBoard, level: job.request.level });
  const validated = validateResult(local, request);
  if (!validated) throw new Error("Generated lesson failed the learning-quality checks.");
  // This path only writes to IndexedDB. Mark the result device-only so callers never
  // mistake a local save for durable server persistence or complete the cloud job.
  const result: LessonGenerationResult = { id: job.id, title: validated.title, blocks: validated.blocks, offlineFallback: generated?.offlineFallback === true, localModel: !!generated?.localModel, localOnly: true };
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({ id: result.id, ownerUserId, title: result.title, subject: job.request.subject, topic: job.request.prompt, description: `Generated locally for ${job.request.prompt}. Waiting to sync to your cloud library.`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: undefined, generationJobId: job.id, generationPrompt: job.request.prompt, generationGoal: job.request.goal, generationLevel: job.request.level, generationExamBoard: job.request.examBoard, generationVerifiedFallback: generated?.offlineFallback === true, syncStatus: "pending", syncRetryCount: 0, size: JSON.stringify(result).length });
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

async function generateWithVisibleLocalModelProgress(
  job: GenerationJob<LessonGenerationInput>,
  prompt: string,
  options: { maxTokens: number; json: boolean },
): Promise<string> {
  const unsubscribe = subscribeBrowserLocalModelStatus((status, progress) => {
    if (status !== "loading") return;
    const current = getGenerationJob(job.id);
    const visibleProgress = Math.max(
      current?.progress ?? 15,
      Math.min(36, 18 + Math.round(progress * 0.18)),
    );
    updateGenerationJob(job.id, {
      status: "generating",
      progress: visibleProgress,
      error: progress < 100
        ? `Cortex is preparing its on-device model (${Math.round(progress)}%). The first model download may take time; this is local setup, not another cloud-provider retry.`
        : "Cortex is preparing on-device inference.",
    });
  });
  try {
    return await generateBrowserLocal(prompt, undefined, options);
  } finally {
    unsubscribe();
  }
}

async function tryLocalModel(job: GenerationJob<LessonGenerationInput>, token: string, persistProgress = true): Promise<LessonGenerationResult | null> {
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

  const context = await localContext(job);
  const resolved = buildResolvedLessonPrompt(request);
  const crossDeviceMemory = await readCrossDeviceLearnerMemory(token, job.request.subject, request.topic);
  const learnerContext = [context, crossDeviceMemory].filter(Boolean).join("\n\n");
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

  const persistedPartial = job.partial && typeof job.partial === "object" ? job.partial : null;
  const persistedBlocks = persistedPartial && Array.isArray((persistedPartial as Record<string, unknown>).blocks)
    ? ((persistedPartial as Record<string, unknown>).blocks as Array<Record<string, unknown>>)
    : [];
  const persistedCompletedUnits = persistedPartial && typeof (persistedPartial as Record<string, unknown>).completedUnits === "number"
    ? Math.max(0, Math.min(sectionPlan.length, Math.floor((persistedPartial as Record<string, unknown>).completedUnits as number)))
    : 0;
  const allBlocks: Array<Record<string, unknown>> = [...persistedBlocks];
  let title = persistedPartial && typeof (persistedPartial as Record<string, unknown>).title === "string"
    ? String((persistedPartial as Record<string, unknown>).title)
    : request.topic || job.request.prompt;

  for (let index = persistedCompletedUnits; index < sectionPlan.length; index += 1) {
    const sectionPrompt = `You are generating section ${index + 1} of ${sectionCount} of one coherent lesson.

REQUEST
${resolved}

VERIFIED LOCAL CURRICULUM
${grounding || context || "No verified curriculum data is cached. Do not invent board-specific claims."}\n\n${learnerContext}

SECTION JOB
${sectionPlan[index]}

ALREADY GENERATED SECTIONS
${allBlocks.slice(-8).map((block) => `${String(block.type)}: ${String(block.content)}`).join("\n") || "None"}

${buildPresentationGuidance(job.request.subject, request.topic)}

TEACHING CONTRACT
- This is one section of a larger lesson. Do not repeat earlier material unless a short bridge is genuinely useful.
- Stay strictly inside the requested subject and topic.
- Teach rather than summarise. Explain why, how, and when the ideas matter.
- Use student-facing language, concrete examples, and step-by-step reasoning.
- Do not invent syllabus requirements, facts, numerical answers, or citations.
- Checkpoints must ask the learner to think. Do not put the answer in the checkpoint itself.
- Avoid giant paragraphs.
- Every block must teach one distinct, specific idea from the requested topic. Replace vague filler and repeated topic restatements with the actual principle, mechanism, method, evidence, or consequence.
- Define specialist terms when first used. Explain why a method works, not only the steps to memorise.
- Worked examples must include a realistic task, given information, method choice, intermediate steps, final result, and interpretation or check. Preserve correct units and notation.
- Practice and exam questions must test this exact topic and contain enough information to attempt. Put concise answers or marking guidance in practice/exam blocks, never in checkpoints.
- Do not repeat an explanation, example, or question with only names or numbers changed. Conceptual topics need specific scenarios, processes, comparisons, or evidence rather than forced calculations.
- Preserve subject accuracy: terminology, notation, units, significant figures, practical method, controls, observations, and evaluation where relevant.

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
SECTION-SPECIFIC REQUIREMENTS
${buildLocalSectionRequirements(index, sectionCount)}
- Across the lesson, include at least 3 worked examples, 3 thinking checkpoints, 1 exam-transfer block, 1 mistake/misconception block, and 1 summary.
- A checkpoint must make the learner do some thinking. Do not reveal its answer.

MATH
Every mathematical expression uses single-dollar LaTeX delimiters. Never use caret exponents or ASCII fractions.`;

    try {
      let parsed: ReturnType<typeof parseLocalModelSection> = null;
      let lastRaw = "";
      let lastIssue = "The model returned no usable section.";
      // A valid JSON object is not automatically a valid teaching section.
      // Give the local model one targeted repair before abandoning the whole lesson.
      for (let repair = 0; repair < 2 && !parsed; repair += 1) {
        const attemptPrompt = repair === 0
          ? sectionPrompt
          : `${sectionPrompt}

LOCAL SECTION REPAIR
The previous output did not satisfy the minimum section contract.
Problem: ${lastIssue}
Previous output:
${lastRaw.slice(0, 6000)}
Return a corrected JSON object with a title and at least 3 distinct, substantive blocks. Each block must have type, title, and content. Do not repeat previous sections.`;
        lastRaw = await generateWithVisibleLocalModelProgress(job, attemptPrompt, {
          maxTokens: request.broadTopic ? 1400 : 1200,
          json: true,
        });
        parsed = parseLocalModelSection(lastRaw);
        if (!parsed || parsed.blocks.length < 3) {
          lastIssue = "Expected a JSON object with a title and at least 3 substantive blocks.";
          parsed = null;
        }
      }
      if (!parsed) throw new Error(`Local model section contract failed: ${lastIssue}`);

      if (index === 0 && parsed.title) title = parsed.title;
      const usable = parsed.blocks
        .filter((block) => !allBlocks.some((existing) =>
          String(existing.type) === String(block.type) &&
          String(existing.content).trim() === String(block.content).trim()
        ))
        .slice(0, 6);

      if (usable.length < 3) throw new Error("Local model repeated existing content instead of teaching new material.");
      allBlocks.push(...usable);

      const progress = Math.min(75, 20 + Math.round(((index + 1) / sectionCount) * 55));
      if (persistProgress) {
        updateGenerationJob(job.id, {
          status: "partial",
          progress,
          partial: { title, blocks: allBlocks, completedUnits: index + 1, totalUnits: sectionCount },
        });
        await syncDurableGenerationJob(
          token,
          (getGenerationJob(job.id) ?? job) as GenerationJob,
          "progress",
          { leaseId: generationLeaseId(job.id) },
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.info("[LEARN] browser-local section failed", {
        section: index + 1,
        error: reason,
      });
      throw new Error(`Browser-local section ${index + 1} failed: ${reason}`);
    }
  }

  const minimumBlocks = request.broadTopic ? 14 : 10;
  if (allBlocks.length < minimumBlocks) {
    throw new Error(`Browser-local lesson assembled ${allBlocks.length} blocks; ${minimumBlocks} are required before quality review.`);
  }

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
    console.info("[LEARN] browser-local lesson needs a final quality repair", {
      failures: quality.failures,
      topic: request.topic,
    });
    try {
      const repairPrompt = `You are repairing an almost-complete student lesson. Do not rewrite the existing lesson.
SUBJECT: ${job.request.subject}
TOPIC: ${request.topic}
LEARNER LEVEL: ${job.request.level || "unspecified"}
EXAM BOARD: ${job.request.examBoard || "unspecified"}

QUALITY GAPS TO FIX:
${quality.failures.map((failure) => `- ${failure}`).join("\n")}

EXISTING SECTION HEADINGS AND TYPES:
${candidate.blocks.map((block) => `- ${String(block.type)}: ${String(block.title || "").slice(0, 100)}`).join("\n")}

Return ONLY JSON with a title and 3-6 NEW blocks that specifically fill the listed gaps. Do not duplicate the existing headings or material. Every block must contain type, title, and at least 40 characters of accurate teaching content. Use a worked example, thinking checkpoint, exam-transfer block, misconception/mistake block, synthesis, or summary only where it fills a real gap. Never invent syllabus requirements or reveal the answer inside a checkpoint.`;
      const repairRaw = await generateWithVisibleLocalModelProgress(job, repairPrompt, {
        maxTokens: 1400,
        json: true,
      });
      const patch = parseLocalModelSection(repairRaw);
      const additions = (patch?.blocks ?? []).filter((block) => !candidate.blocks.some((existing) =>
        String(existing.type) === String(block.type) &&
        String(existing.content).trim() === String(block.content).trim()
      ));
      if (additions.length) {
        const repairedCandidate: LessonGenerationResult = {
          ...candidate,
          blocks: [...candidate.blocks, ...additions].slice(0, request.broadTopic ? 36 : 28),
        };
        const repairedQuality = lessonQualityFailures({
          title: repairedCandidate.title,
          blocks: repairedCandidate.blocks.map((block) => ({
            type: String(block.type),
            title: typeof block.title === "string" ? block.title : undefined,
            content: String(block.content),
          })),
        }, request);
        if (repairedQuality.failures.length === 0) return repairedCandidate;
        console.info("[LEARN] final local quality repair still failed", {
          failures: repairedQuality.failures,
          topic: request.topic,
        });
      }
    } catch (error) {
      console.info("[LEARN] final local quality repair failed", {
        error: error instanceof Error ? error.message : String(error),
        topic: request.topic,
      });
    }
    throw new Error(`Browser-local lesson failed quality checks after bounded repair: ${quality.failures.join(", ")}`);
  }

  return candidate;
}
async function persistGeneratedLesson(job: GenerationJob<LessonGenerationInput>, generated: LessonGenerationResult, token: string, leaseId?: string): Promise<LessonGenerationResult> {
  const request = resolvedRequest(job);
  const validated = validateResult(generated, request);
  if (!validated) throw new Error("Generated lesson failed the learning-quality checks before persistence.");
  // Durable jobs remain lease-owned when recovery switches from cloud to browser-local generation.
  const effectiveLeaseId = leaseId ?? generationLeaseId(job.id);
  let response: Response | null = null;
  let persistenceError = "";
  try {
    response = await fetch("/api/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: "lesson",
        learningMode: getLearningMode(),
        generationMode: "persist",
        generationJobId: job.id,
        generationLeaseId: effectiveLeaseId,
        subject: job.request.subject,
        topic: job.request.prompt,
        difficulty: job.request.difficulty,
        goal: job.request.goal,
        level: job.request.level,
        examBoard: job.request.examBoard,
        generatedLesson: {
          title: validated.title,
          blocks: validated.blocks,
          verifiedCurriculumFallback: validated.offlineFallback === true,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      persistenceError = typeof data?.error === "string" ? data.error : `Lesson persistence failed (${response.status})`;
    } else {
      const data = await response.json().catch(() => ({}));
      if (data?.id && Array.isArray(data?.blocks)) {
        const persisted: LessonGenerationResult = {
          id: String(data.id),
          title: String(data.title || validated.title),
          blocks: data.blocks as Array<Record<string, unknown>>,
          localModel: validated.localModel,
          offlineFallback: validated.offlineFallback,
        };
        updateGenerationJob(job.id, { status: "complete", progress: 100, result: persisted, partial: undefined, error: undefined });
        if (getActiveId() === job.id) saveActiveId(null);
        openCompletedLesson(persisted);
        return persisted;
      }
      persistenceError = "The server did not confirm that the lesson was saved.";
    }
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : String(error);
  }

  // A persistence outage must not destroy a valid lesson already generated in memory.
  // Save it to this device and explicitly mark it local-only; callers must not report
  // cloud completion when no server lesson row was confirmed.
  const localOnly: LessonGenerationResult = {
    id: job.id,
    title: validated.title,
    blocks: validated.blocks,
    localModel: validated.localModel,
    offlineFallback: validated.offlineFallback,
    localOnly: true,
  };
  // The local lesson store is user-scoped. Resolve the owner from the same
  // bearer token used for the failed cloud write so a shared device cannot
  // strand the lesson in an ownerless record or expose it to another account.
  const { createClient } = await import("@/lib/supabase/client");
  const { data: ownerData, error: ownerError } = await createClient().auth.getUser(token);
  const ownerUserId = ownerData.user?.id;
  if (ownerError || !ownerUserId) {
    throw new Error("Cloud save failed and this device could not verify the lesson owner. Sign in again before retrying; the generated lesson remains in the current generation checkpoint.");
  }
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({
    id: localOnly.id,
    ownerUserId,
    title: localOnly.title,
    subject: job.request.subject,
    topic: job.request.prompt,
    description: `Cloud save failed. This generated lesson is waiting to sync. Last error: ${persistenceError.slice(0, 240)}`,
    blocks: localOnly.blocks,
    difficulty: job.request.difficulty,
    progress: 0,
    completed: false,
    downloadedAt: now,
    // This lesson has not been confirmed in cloud storage. Do not label it synced.
    lastSyncedAt: undefined,
    generationJobId: job.id,
    generationPrompt: job.request.prompt,
    generationGoal: job.request.goal,
    generationLevel: job.request.level,
    generationExamBoard: job.request.examBoard,
    generationVerifiedFallback: validated.offlineFallback === true,
    syncStatus: "pending",
    syncRetryCount: 0,
    size: JSON.stringify(localOnly).length,
  });
  updateGenerationJob(job.id, {
    status: "complete",
    progress: 100,
    result: localOnly,
    partial: undefined,
    error: undefined,
  });
  if (getActiveId() === job.id) saveActiveId(null);
  openCompletedLesson(localOnly);
  console.warn("[LEARN] lesson generated but saved locally because server persistence failed", {
    topic: request.topic,
    error: persistenceError,
    responseStatus: response?.status ?? null,
  });
  return localOnly;
}

async function tryCloudLesson(job: GenerationJob<LessonGenerationInput>, token: string): Promise<LessonGenerationResult | null> {
    let data: any = null;
    let lastError: unknown = null;
    const request = resolvedRequest(job);
    const researchMemoryContext = await buildResearchMemoryContext(request.topic, job.request.subject, 4).catch(() => "");
    const sectionCount = request.broadTopic ? 6 : 4;
    const persistedPartial = job.partial && typeof job.partial === "object" ? job.partial : null;
    let assembledBlocks: Array<Record<string, unknown>> = persistedPartial && Array.isArray((persistedPartial as Record<string, unknown>).blocks)
      ? [...((persistedPartial as Record<string, unknown>).blocks as Array<Record<string, unknown>>)]
      : [];
    const persistedCompletedUnits = persistedPartial && typeof (persistedPartial as Record<string, unknown>).completedUnits === "number"
      ? Math.max(0, Math.min(sectionCount, Math.floor((persistedPartial as Record<string, unknown>).completedUnits as number)))
      : 0;
    let assembledTitle = persistedPartial && typeof (persistedPartial as Record<string, unknown>).title === "string"
      ? String((persistedPartial as Record<string, unknown>).title)
      : request.topic || job.request.prompt;
    let assembledOfflineFallback = false;

    const leaseId = generationLeaseId(job.id);
    for (let sectionIndex = persistedCompletedUnits; sectionIndex < sectionCount; sectionIndex += 1) {
      if (getGenerationJob(job.id)?.status === "complete") return null;
      let sectionData: any = null;
      for (let attempt = 0; attempt < MAX_CLOUD_ATTEMPTS; attempt += 1) {
        const progress = Math.min(88, 20 + Math.round((sectionIndex / sectionCount) * 68) + Math.min(5, attempt));
        if (getGenerationJob(job.id)?.status === "complete") return null;
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
        let leaseLost = false;
        const heartbeatTimer = setInterval(() => {
          void (async () => {
            try {
              const heartbeat = await heartbeatGenerationLease(token, job.id, leaseId);
              if (heartbeat === "lost") {
                leaseLost = true;
                controller.abort();
              }
            } catch {
              // A transient heartbeat failure is harmless if a later heartbeat succeeds.
            }
          })();
        }, 20_000);
        const timeout = setTimeout(() => controller.abort(), CLOUD_GENERATION_TIMEOUT_MS);
        try {
          const response = await fetchPendingLessonSync("/api/learn", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              type: "lesson",
              learningMode: getLearningMode(),
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
              researchMemoryContext: researchMemoryContext.slice(0, 6000),
              generationJobId: job.id,
              generationLeaseId: generationLeaseId(job.id),
            }),
            cache: "no-store",
            signal: controller.signal,
          });
          sectionData = await response.json().catch(() => ({}));
          if (leaseLost) {
            throw new Error("CORTEX_LEASE_CONFLICT");
          }
          if (response.ok && sectionData?.complete === true && Array.isArray(sectionData?.partialBlocks)) {
            assembledBlocks = sectionData.partialBlocks;
            if (typeof sectionData.title === "string") assembledTitle = sectionData.title;
            assembledOfflineFallback = sectionData.deterministicFallback === true;
            break;
          }
          if (response.ok && Array.isArray(sectionData?.blocks) && sectionData.blocks.length >= 3) break;

          const providerUnavailable = sectionData?.providerUnavailable === true || sectionData?.retryable === false;
          if (sectionData?.leaseConflict === true) {
            throw new Error("CORTEX_LEASE_CONFLICT");
          }
          lastError = new Error(
            providerUnavailable
              ? `Cortex provider unavailable: ${sectionData?.error || "No online AI provider is currently available."}`
              : (sectionData?.error
                ? `${sectionData.error}${Array.isArray(sectionData?.details) && sectionData.details.length
                  ? `: ${sectionData.details.map((d: { message?: unknown }) => (typeof d?.message === "string" ? d.message : "")).filter(Boolean).slice(0, 2).join("; ")}`
                  : ""}`
                : `Section generation failed (${response.status})`)
          );
          if (providerUnavailable) throw lastError;
          const retryable = response.status === 408 || response.status === 409 || response.status === 422 ||
            response.status === 429;
          if (!retryable || attempt === MAX_CLOUD_ATTEMPTS - 1) throw lastError;
        } catch (error) {
          lastError = error;
          if (String(error instanceof Error ? error.message : error).toLowerCase().includes("provider unavailable")) {
            throw error;
          }
          throw error;
        } finally {
          clearTimeout(timeout);
          clearInterval(heartbeatTimer);
        }
        // Server-side repair is the only retry allowed for a section.
      }

      if (sectionData?.complete === true && Array.isArray(sectionData?.partialBlocks)) {
        assembledBlocks = sectionData.partialBlocks;
        if (typeof sectionData.title === "string") assembledTitle = sectionData.title;
        assembledOfflineFallback = sectionData.deterministicFallback === true;
        break;
      }

      if (!sectionData?.blocks?.length) {
        throw lastError instanceof Error ? lastError : new Error("The lesson section service returned no usable section.");
      }

      if (typeof sectionData.title === "string" && sectionIndex === 0) assembledTitle = sectionData.title;
      assembledBlocks = Array.isArray(sectionData.partialBlocks)
        ? sectionData.partialBlocks
        : [...assembledBlocks, ...sectionData.blocks];

      if (getGenerationJob(job.id)?.status === "complete") return null;
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
      await syncDurableGenerationJob(
        token,
        (getGenerationJob(job.id) ?? job) as GenerationJob,
        "progress",
        { leaseId },
      );
    }

    data = {
      id: job.id,
      title: finalLessonTitle(assembledTitle, request.topic),
      // Sections cannot each carry the topic's built-in diagram, so the assembled lesson gets it here.
      blocks: ensureRequiredDiagram(assembledBlocks, request) as Array<Record<string, unknown>>,
    };
    if (!data?.id || !Array.isArray(data?.blocks)) throw lastError instanceof Error ? lastError : new Error("The lesson service returned an incomplete lesson.");
    updateGenerationJob(job.id, { status: "partial", progress: 92 });
    const result = validateResult({
      id: data.id,
      title: data.title || request.topic || job.request.prompt,
      blocks: data.blocks,
      offlineFallback: assembledOfflineFallback,
      localModel: false,
    }, request);
    if (!result) throw new Error("The lesson service returned a lesson that failed the learning-quality checks.");
    updateGenerationJob(job.id, { status: "partial", progress: 92, partial: { title: result.title, blocks: result.blocks } });

    return assembledOfflineFallback ? { ...result, offlineFallback: true, localModel: false } : result;
}
async function runJob(
  job: GenerationJob<LessonGenerationInput>,
  token: string,
  allowCheckpointResume = true,
) {
  // One browser job owns one durable identity. Retries and refreshes reuse it.
  // A reconnect event can arrive while the original fetch is still unwinding.
  // Never start a second runner for the same durable job and lease.
  if (runningJobId) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id); updateGenerationJob(job.id, { status: "warming", progress: Math.max(5, getGenerationJob(job.id)?.progress ?? 5), error: undefined });
  let localModelAttempted = false;
  const classicMode = getLearningMode() === "classic";
  try {
    rememberLocalTopic(job.request.prompt);
    updateGenerationJob(job.id, {
      status: "generating",
      progress: Math.max(15, getGenerationJob(job.id)?.progress ?? 15),
      error: "Cortex is selecting the best available generation lane…",
    });
    const online = isBrowser() ? navigator.onLine : false;

    // Classic is non-generative, not offline-only: retrieve current shared learning
    // resources over the network first, then fall back to authored device content.
    if (classicMode) {
      let classicLesson: { title: string; blocks: Array<Record<string, unknown>>; source?: "public-web-search" | "shared-library" | "verified-syllabus-guide" | "authored-local" } | null = null;\n      if (online) {\n        classicLesson = await fetchLibraryRecovery(job.request.subject, job.request.prompt, "/api/learn/research", 7000, token);\n      }\n      if (!classicLesson && online) {\n        classicLesson = await fetchLibraryRecovery(job.request.subject, job.request.prompt, "/api/library/recover", 6000, token);\n      }\n      if (!classicLesson && online) {
        classicLesson = await fetchLibraryRecovery(job.request.subject, job.request.prompt, "/api/library/guide", 9000, token);
      }
      if (!classicLesson) {
        const authored = buildDeterministicLessonFallback(job.request.subject, job.request.prompt) as { title: string; blocks: Array<Record<string, unknown>> } | null;
        if (authored) classicLesson = { ...authored, source: "authored-local" };
      }
      if (!classicLesson) {
        throw new Error("Classic mode does not use generative AI. Online shared resources and verified syllabus guides were unavailable, and no authored or cached lesson covers this topic. Reconnect and try again, or switch to Cortex AI for a newly generated lesson.");
      }
      const classicResult: LessonGenerationResult = {
        id: job.id,
        title: classicLesson.title,
        blocks: classicLesson.blocks,
        offlineFallback: true,
        localModel: false,
        source: classicLesson.source ?? "authored-local",
      };
      const finished = token && online
        ? await persistGeneratedLesson(job, classicResult, token, generationLeaseId(job.id))
        : await saveLocalResult(job, classicResult);
      if (token && online && !isLocalOnlyCompletion(finished)) {
        await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
      }
      return getGenerationJobs().find(item => item.id === job.id) ?? finished;
    }

    // "available" is the initial UI state, not proof that this device can run WebGPU.
    // Probe the actual adapter before selecting a local lane; otherwise an unsupported
    // browser can be sent into a model-load attempt after the cloud lane fails.
    const browserModelAvailable = isBrowser()
      ? await isBrowserLocalModelAvailable()
      : false;
    const localStatus = isBrowser() ? getBrowserLocalModelStatus().status : "unsupported";
    const localReady = localStatus === "ready";
    const hybrid = chooseHybridExecutionMode({
      online,
      browserModelReady: localReady,
      browserModelAvailable,
      cloudAvailable: online,
      peerAvailable: false,
    }, "deep");

    // Prefer exact authored recovery immediately when offline or unauthenticated.
    // An authenticated online learner must get a real Cortex generation attempt first;
    // the section API itself returns the curated lesson if its provider chain fails.
    // This keeps the fast recovery path from silently replacing successful AI teaching.
    const fastRecoveryContext = isBrowser() ? await localContext(job) : "";
    if (
      isBrowser() &&
      shouldUseFastVerifiedCurriculumRecovery({ online, hasSessionToken: Boolean(token) }) &&
      hasLocalLessonFallback(job.request.subject, job.request.prompt, fastRecoveryContext, { board: job.request.examBoard, level: job.request.level })
    ) {
      try {
        updateGenerationJob(job.id, {
          status: "generating",
          progress: 10,
          error: "Cortex is using verified curriculum recovery while online generation is unavailable or warming up.",
        });
        const local = generateLocalLesson(job.request.subject, job.request.prompt, fastRecoveryContext, { board: job.request.examBoard, level: job.request.level });
        if (local.blocks.length >= 10) {
          const localFallback: LessonGenerationResult = {
            id: local.id,
            title: local.title,
            blocks: local.blocks,
            offlineFallback: true,
            localModel: false,
          };
          const finished = token && online
            ? await persistGeneratedLesson(job, localFallback, token, generationLeaseId(job.id))
            : await saveLocalResult(job, localFallback);
          if (token && online && !isLocalOnlyCompletion(finished)) {
            await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
          }
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (error) {
        console.warn("[LEARN] fast verified curriculum recovery failed", error instanceof Error ? error.message : String(error));
      }
    }

    // Serialize lesson generation lanes because they share one durable checkpoint.
    // firstSuccessful does not cancel the losing lane, so concurrent generation can
    // overwrite the winner's partial payload and make resume state inconsistent.
    // Run cloud first, then use the warm local model as recovery if cloud fails.

    if (hybrid.mode === "local" && localReady) {
      localModelAttempted = true;
      const localModel = await tryLocalModel(job, token);
      if (localModel) {
        if (token) {
          const finished = await persistGeneratedLesson(job, localModel, token);
          if (!isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
        return saveLocalResult(job, localModel);
      }
    }

    // Cloud and browser-local inference are independent lanes. A provider exception
    // must not jump directly to the outer failure handler and skip local recovery.
    if (hybrid.mode === "cloud" || hybrid.mode === "parallel-prep" || hybrid.mode === "parallel") {
      let cloudModel: LessonGenerationResult | null = null;
      let cloudFailure: unknown = null;
      try {
        cloudModel = await tryCloudLesson(job, token);
      } catch (error) {
        cloudFailure = error;
        console.warn("[LEARN] cloud lane failed; evaluating on-device recovery",
          error instanceof Error ? error.message : String(error));
      }

      if (cloudModel) {
        const finished = await persistGeneratedLesson(job, cloudModel, token, generationLeaseId(job.id));
        if (!isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
        return getGenerationJobs().find(item => item.id === job.id) ?? job;
      }

      let localFailure: unknown = null;
      // The model may have started loading while the cloud lane was running.
      // Do not rely on the readiness snapshot taken at job start: a model that is
      // already loading can still be awaited through generateBrowserLocal().
      const localStatusAfterCloud = getBrowserLocalModelStatus().status;
      const localCanRecover = localStatusAfterCloud === "ready" || localStatusAfterCloud === "loading";
      if (localCanRecover) {
        updateGenerationJob(job.id, {
          status: "generating",
          progress: Math.max(20, getGenerationJob(job.id)?.progress ?? 20),
          error: cloudFailure
            ? "Cloud generation failed. Cortex is switching to on-device recovery; your checkpoint is preserved."
            : "Cloud generation returned no usable lesson. Cortex is switching to on-device recovery.",
        });
        try {
          localModelAttempted = true;
          const localModel = await runLocalRecoveryWithHeartbeat(job, token, () => tryLocalModel(job, token));
          if (localModel) {
            const finished = token && online
              ? await persistGeneratedLesson(job, localModel, token, generationLeaseId(job.id))
              : await saveLocalResult(job, localModel);
            if (token && online) {
              if (!isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
            }
            return getGenerationJobs().find(item => item.id === job.id) ?? finished;
          }
          localFailure = new Error("On-device lesson generation returned no valid lesson.");
        } catch (error) {
          localFailure = error;
          console.warn("[LEARN] on-device recovery failed",
            error instanceof Error ? error.message : String(error));
        }
      }

      if (cloudFailure || localFailure) {
        const details = [
          cloudFailure instanceof Error ? `Cloud lane: ${cloudFailure.message}` : null,
          localFailure instanceof Error ? `On-device lane: ${localFailure.message}` : null,
        ].filter(Boolean).join(". ");
        throw new Error(details || "Cloud and on-device generation did not produce a valid lesson.");
      }
    }

    if (isBrowser() && !navigator.onLine) {
      const finished = await saveLocalResult(job);
      return finished;
    }

    throw new Error("All online lesson generation lanes failed.");
  } catch (error) {
    // Use the latest stored job because section generation updates its checkpoint in storage.
    const currentJob = (getGenerationJob(job.id) ?? job) as GenerationJob<LessonGenerationInput>;
    const message = errorMessage(error);
    // Connectivity loss is a pause, not a generation failure. Keep the last
    // completed section checkpoint intact and let reconnect recovery resume it.
    if (isBrowser() && !navigator.onLine) {
      updateGenerationJob(job.id, {
        status: "queued",
        progress: Math.min(90, Math.max(20, currentJob.progress ?? job.progress)),
        error: "Waiting for a connection.",
      });
      saveActiveId(job.id);
      return getGenerationJobs().find(item => item.id === job.id) ?? currentJob;
    }
    const context = await localContext(currentJob as GenerationJob<LessonGenerationInput>);
    const failureClass = classifyCortexExecutionFailure(error);
    const recoveryPolicy = getCortexRecoveryPolicy(failureClass, {
      hasVerifiedData: isBrowser() && !navigator.onLine && hasLocalLessonFallback(currentJob.request.subject, currentJob.request.prompt, context, { board: currentJob.request.examBoard, level: currentJob.request.level }),
      hasWarmLocal: !localModelAttempted && isBrowser() && ["ready", "loading"].includes(getBrowserLocalModelStatus().status),
      hasCheckpoint: hasCompletedLessonCheckpoint(currentJob.partial),
      supportsRepair: false,
    });

    if (message === "CORTEX_LEASE_CONFLICT") {
      updateGenerationJob(job.id, {
        status: "queued",
        progress: Math.min(90, Math.max(20, job.progress)),
        error: "Another Cortex tab is finishing this lesson. Your checkpoint is safe and will resume when that run releases the lease.",
      });
      saveActiveId(job.id);
      return getGenerationJobs().find(item => item.id === job.id) ?? job;
    }

    // Authenticated online Cortex AI requests must not be marked complete with curated
    // material after provider or quality failure. Authored recovery is strictly offline;
    // a missing session while online must surface as an authentication problem, not a fake lesson.
    const allowAuthoredRecovery = isBrowser() && !navigator.onLine;
    let curatedFallback: { title: string; blocks: Array<Record<string, unknown>> } | null = allowAuthoredRecovery
      ? buildDeterministicLessonFallback(currentJob.request.subject, currentJob.request.prompt)
      : null;
    if (!curatedFallback && allowAuthoredRecovery && isBrowser()) {
      curatedFallback = await fetchLibraryRecovery(currentJob.request.subject, currentJob.request.prompt, "/api/library/recover", 6000, token);
    }
    if (!curatedFallback && allowAuthoredRecovery && isBrowser()) {
      curatedFallback = await fetchLibraryRecovery(currentJob.request.subject, currentJob.request.prompt, "/api/library/guide", 9000, token);
    }
    if (curatedFallback && isBrowser()) {
      try {
        const fallbackResult: LessonGenerationResult = {
          id: currentJob.id,
          title: curatedFallback.title,
          blocks: curatedFallback.blocks,
          offlineFallback: true,
          localModel: false,
        };
        const canPersist = Boolean(token && navigator.onLine);
        const finished = canPersist
          ? await persistGeneratedLesson(currentJob as GenerationJob<LessonGenerationInput>, fallbackResult, token, generationLeaseId(currentJob.id))
          : await saveLocalResult(currentJob as GenerationJob<LessonGenerationInput>, fallbackResult);
        if (canPersist && !isLocalOnlyCompletion(finished)) {
          await syncCompletedGenerationBestEffort(token, (getGenerationJob(currentJob.id) ?? finished) as GenerationJob);
        }
        return getGenerationJobs().find(item => item.id === currentJob.id) ?? finished;
      } catch (curatedRecoveryError) {
        console.warn("[LEARN] authored curriculum recovery could not be saved", {
          topic: currentJob.request.prompt,
          error: curatedRecoveryError instanceof Error ? curatedRecoveryError.message : String(curatedRecoveryError),
        });
      }
    }

    // Cortex recovery policy selects exactly one safe recovery lane. The browser
    // runner executes that decision, but never invents a generic whole-job retry.
    if (recoveryPolicy.action === "resume_checkpoint" && allowCheckpointResume && !classicMode) {
      // A checkpoint recovery is a bounded continuation, not a whole-job retry.
      // Re-enter the same durable job exactly once so tryCloudLesson/tryLocalModel
      // starts from completedUnits already stored in job.partial.
      updateGenerationJob(job.id, {
        status: "queued",
        progress: Math.min(90, Math.max(20, getGenerationJob(job.id)?.progress ?? job.progress)),
        error: "Cortex preserved your checkpoint. Resuming from the saved progress instead of restarting.",
      });
      saveActiveId(job.id);
      const checkpointJob = getGenerationJob(job.id) ?? job;
      await syncDurableGenerationJob(token, checkpointJob as GenerationJob, "progress", {
        leaseId: generationLeaseId(job.id),
      });
      return runJob(checkpointJob as GenerationJob<LessonGenerationInput>, token, false);
    }

    if (recoveryPolicy.action === "stop_cleanly") {
      updateGenerationJob(job.id, {
        status: "failed",
        progress: job.progress,
        error: message + " Cortex stopped this generation cleanly. Your request is safe to retry manually.",
      });
      await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "failed");
      if (getActiveId() === job.id) saveActiveId(null);
      return getGenerationJobs().find(item => item.id === job.id) ?? job;
    }

    // Execute the selected recovery lane. Never turn an outage into a hidden model download.
    if (recoveryPolicy.action === "use_verified_data" && isBrowser() && navigator.onLine && hasLocalLessonFallback(job.request.subject, job.request.prompt, context, { board: job.request.examBoard, level: job.request.level })) {
      try {
        const local = generateLocalLesson(job.request.subject, job.request.prompt, context, { board: job.request.examBoard, level: job.request.level });
        if (local.blocks.length >= 10) {
          updateGenerationJob(job.id, { status: "generating", progress: Math.max(26, Math.min(40, getGenerationJob(job.id)?.progress ?? 26)), error: "Cloud generation is unavailable. Cortex is switching to verified curriculum recovery." });
          const localFallback: LessonGenerationResult = { id: local.id, title: local.title, blocks: local.blocks, offlineFallback: true, localModel: false };
          const finished = token ? await persistGeneratedLesson(job, localFallback, token, generationLeaseId(job.id)) : await saveLocalResult(job, localFallback);
          if (token && !isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (fallbackError) {
        console.warn("[LEARN] verified curriculum recovery failed", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }

    if (!classicMode && recoveryPolicy.action === "use_warm_local" && isBrowser() && navigator.onLine && ["ready", "loading"].includes(getBrowserLocalModelStatus().status)) {
      try {
        updateGenerationJob(job.id, { status: "generating", progress: Math.max(40, Math.min(55, getGenerationJob(job.id)?.progress ?? 40)), error: "Cloud generation is unavailable. Cortex is using the warm browser-local model." });
        localModelAttempted = true;
        const localModel = await runLocalRecoveryWithHeartbeat(job, token, () => tryLocalModel(job, token));
        if (localModel) {
          const finished = token ? await persistGeneratedLesson(job, localModel, token, generationLeaseId(job.id)) : await saveLocalResult(job, localModel);
          if (token && !isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (localModelError) {
        console.warn("[LEARN] warm browser-local recovery failed", localModelError instanceof Error ? localModelError.message : String(localModelError));
      }
    }

    if (recoveryPolicy.action === "use_verified_data" && isBrowser() && hasLocalLessonFallback(job.request.subject, job.request.prompt, context, { board: job.request.examBoard, level: job.request.level })) {
      try {
        // An online provider failure is not an offline-storage success.
        // Build from the verified local curriculum lane, then use the same
        // server persistence path so the lesson is not stranded on one device.
        const localFallback = await (async () => {
          const request = resolvedRequest(job);
          const local = generateLocalLesson(job.request.subject, job.request.prompt, context, { board: job.request.examBoard, level: job.request.level });
          const validated = validateResult(
            { id: local.id, title: local.title, blocks: local.blocks },
            request,
          );
          if (!validated) throw new Error("Local curriculum fallback failed the learning-quality checks.");
          return { ...validated, offlineFallback: false, localModel: false };
        })();

        if (token && navigator.onLine) {
          const finished = await persistGeneratedLesson(job, localFallback, token, generationLeaseId(job.id));
          if (!isLocalOnlyCompletion(finished)) await syncCompletedGenerationBestEffort(token, (getGenerationJob(job.id) ?? finished) as GenerationJob);
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }

        return await saveLocalResult(job, localFallback);
      } catch (fallbackError) {
        console.warn("[LEARN] local fallback was available but failed its quality gate", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }
    if (isBrowser() && !navigator.onLine) {
      updateGenerationJob(job.id, { status: "queued", progress: 20, error: "Waiting for a connection." });
      saveActiveId(job.id);
    } else {
      // Lesson generation is user-triggered and already has bounded provider and
      // local recovery lanes. Never re-run the entire lesson automatically after
      // an abort, timeout, quota error, malformed response, or provider outage.
      // Automatic whole-job retries were the source of the persistent 20% loop.
      updateGenerationJob(job.id, {
        status: "failed",
        progress: job.progress,
        error: `${message} Cortex stopped this generation cleanly. Your request is safe to retry manually.`,
      });
      await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? job) as GenerationJob, "failed");
      if (getActiveId() === job.id) saveActiveId(null);
    }
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally {
    if (runningJobId === job.id) runningJobId = null;
    // If the browser's "online" event fired before the failed request unwound,
    // the event handler correctly did not start a duplicate runner. Resume here
    // once the original runner has released its lock, using the saved checkpoint.
    const latest = getGenerationJob(job.id);
    if (
      isBrowser() &&
      navigator.onLine &&
      latest?.status === "queued" &&
      latest.error === "Waiting for a connection."
    ) {
      setTimeout(() => {
        const current = getGenerationJob(job.id);
        if (!runningJobId && navigator.onLine && current?.status === "queued" && current.error === "Waiting for a connection.") {
          void resumeLessonGeneration(token).catch((resumeError) => {
            console.warn("[LEARN] reconnect resume could not start", resumeError);
          });
        }
      }, 650);
    }
  }
}
export function queueLessonGeneration(input: LessonGenerationInput) { return createGenerationJob("lesson", input); }
const RESUMABLE_DURABLE_STATUSES = new Set(["queued", "warming", "generating", "partial", "interrupted"]);
const RESUMABLE_DURABLE_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Only a recent, unfinished lesson job may be resumed from the server on page load. Without this,
 * an old failed/stuck job hijacked every later Learn session (production E2E 2026-11-21: starting
 * "Quantum physics" reopened a stale "Dynamics" shell).
 */
export function isResumableDurableLessonJob(row: Record<string, unknown>, now = Date.now()): boolean {
  if (row.kind !== "lesson" || !row.request || typeof row.request !== "object") return false;
  if (!RESUMABLE_DURABLE_STATUSES.has(String(row.status))) return false;
  // Age is measured from creation: every resume bumps updated_at, so a job that keeps failing would
  // otherwise look fresh forever and be resumed on every visit.
  const created = Date.parse(String(row.created_at ?? ""));
  return Number.isFinite(created) && now - created <= RESUMABLE_DURABLE_MAX_AGE_MS;
}

export async function resumeLessonGeneration(token: string | null) { if (!isBrowser() || !token) return null; markInterruptedJobsForRetry(); let active = getActiveGenerationJobs().filter(job => job.kind === "lesson").map(job => job as GenerationJob<LessonGenerationInput>); const preferredId = getActiveId(); let job = (preferredId && active.find(item => item.id === preferredId)) || active[0]; if (!job) { const durable = await listDurableGenerationJobs(token); const remote = durable.find((item) => isResumableDurableLessonJob(item as Record<string, unknown>)) as Record<string, unknown> | undefined; if (remote) {
  // The id-scoped read reconciles the lesson row from the durable checkpoint
  // before the browser resumes generation.
  const reconciled = await getDurableGenerationJob(token, String(remote.id));
  const source = reconciled?.job && typeof reconciled.job === "object"
    ? reconciled.job as Record<string, unknown>
    : remote;
  const restored: GenerationJob<LessonGenerationInput> = {
    id: String(source.id),
    kind: "lesson",
    status: String(source.status) as GenerationJobStatus,
    request: source.request as LessonGenerationInput,
    result: source.result,
    partial: source.partial,
    progress: typeof source.progress === "number" ? source.progress : 0,
    createdAt: Date.parse(String(source.created_at ?? "")) || Date.now(),
    updatedAt: Date.parse(String(source.updated_at ?? "")) || Date.now(),
    error: source.error && typeof source.error === "object"
      ? String((source.error as Record<string, unknown>).message ?? "")
      : undefined,
    retryCount: typeof source.retry_count === "number" ? source.retry_count : 0,
  };
  job = restoreGenerationJob(restored);
} } if (!job) return null; return runJob(job, token); }
export async function retryLessonGeneration(jobId: string, token: string | null) {
  if (!token) return null;
  const job = retryGenerationJob(jobId) as GenerationJob<LessonGenerationInput> | null;
  if (!job) return null;

  // Reuse the original job identity and its partial checkpoint. A retry should
  // continue completed lesson sections instead of silently throwing them away.
  saveActiveId(job.id);
  await syncDurableGenerationJob(token, job, "progress");
  void runJob(job, token);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}

export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) {
  const job = queueLessonGeneration(input);
  if (isBrowser()) {
    if (token) {
      const durableCreated = await syncDurableGenerationJob(token, job, "created");
      if (!durableCreated) {
        console.warn("[LEARN] durable generation checkpoint unavailable; continuing with server-side lesson persistence");
      }
      void runJob(job, token);
      return getGenerationJobs().find(item => item.id === job.id) ?? job;
    }

    // A transient session-read timeout must not silently turn an online request
    // into an IndexedDB-only lesson. Re-read the browser session once before
    // choosing the offline lane.
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient().auth.getSession();
      const recoveredToken = data.session?.access_token ?? null;
      if (recoveredToken) {
        const durableCreated = await syncDurableGenerationJob(recoveredToken, job, "created");
        if (!durableCreated) {
          console.warn("[LEARN] durable generation checkpoint unavailable after session recovery; continuing with server-side lesson persistence");
        }
        void runJob(job, recoveredToken);
        return getGenerationJobs().find(item => item.id === job.id) ?? job;
      }
    } catch {
      // If the session cannot be recovered, the caller may still be genuinely offline.
    }

    if (navigator.onLine) {
      updateGenerationJob(job.id, {
        status: "failed",
        error: "Your session could not be confirmed. Refresh once and try again.",
      });
      saveActiveId(null);
      return getGenerationJobs().find(item => item.id === job.id) ?? job;
    }

    return saveLocalResult(job);
  }
  return job;
}


/** A local status-write failure must never abort syncing the remaining lessons. */
async function updatePendingLessonSyncState(
  lessonId: string,
  userId: string,
  patch: Parameters<typeof offlineStorage.updateLesson>[2],
): Promise<boolean> {
  try {
    await offlineStorage.updateLesson(lessonId, userId, patch);
    return true;
  } catch (error) {
    console.warn("[LEARN] could not update local lesson sync state", {
      lessonId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** Bound sync network waits so a stalled request cannot hold the tab-wide sync lock forever. */
async function fetchPendingLessonSync(input: RequestInfo | URL, init: RequestInit, timeoutMs = 25_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Keep the timeout active while the response body is arriving too. Fetch
    // resolves at headers, so returning the raw Response here would leave a
    // stalled .json() read able to hold the cross-tab sync lock indefinitely.
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    return new Response(body.byteLength ? body : null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Retry locally preserved lessons without running generation again. */
async function runPendingGeneratedLessonSync(options: { manual?: boolean } = {}): Promise<{ synced: number; pending: number }> {
  if (!isBrowser() || !navigator.onLine) return { synced: 0, pending: 0 };
  const { createClient } = await import("@/lib/supabase/client");
  const { data: sessionData } = await createClient().auth.getSession();
  const userId = sessionData.session?.user.id;
  const token = sessionData.session?.access_token;
  if (!userId || !token) return { synced: 0, pending: 0 };
  const pending = await offlineStorage.getPendingLessonSync(userId);
  let synced = 0;
  for (const lesson of pending) {
    if (!navigator.onLine) break;
    if (lesson.ownerUserId !== userId || !lesson.generationJobId || !lesson.generationPrompt || !lesson.blocks?.length) continue;
    if (!options.manual && typeof lesson.syncRetryAfter === "number" && lesson.syncRetryAfter > Date.now()) continue;
    // randomUUID is missing in some older embedded browsers even when the
    // app is otherwise online. Keep the server's UUID validation satisfied
    // rather than silently leaving this lesson pending forever.
    const leaseId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
          const value = Math.floor(Math.random() * 16);
          return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
        });
    try {
      // Offline-only generation may never have reached the server to create its
      // durable job. Recreate that owner-scoped identity before canonical save.
      const durableResponse = await fetchPendingLessonSync("/api/cortex/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          event: "created", id: lesson.generationJobId, kind: "lesson",
          status: "complete", stage: "awaiting_sync",
          request: {
            prompt: lesson.generationPrompt, subject: lesson.subject,
            difficulty: lesson.difficulty || "medium",
            goal: lesson.generationGoal || "Understand and apply the topic.",
            level: lesson.generationLevel, examBoard: lesson.generationExamBoard,
          },
          progress: 100, partial: null, result: null, error: null,
          completedUnits: 0, totalUnits: 0, retryCount: lesson.syncRetryCount || 0,
        }),
        cache: "no-store",
      });
      if (!durableResponse.ok) throw new Error(`Unable to register lesson for sync (${durableResponse.status}).`);

      // A previous persist request may have reached the server and committed
      // successfully even if its response never reached this device. The
      // id-scoped GET reconciles the canonical lesson before returning the job.
      const recoveryResponse = await fetchPendingLessonSync(
        `/api/cortex/generation?id=${encodeURIComponent(lesson.generationJobId)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json().catch(() => ({}));
        const recoveredJob = recoveryData?.job;
        const recoveredResult = recoveredJob?.result;
        if (
          recoveredJob?.status === "complete" &&
          recoveredResult?.id === lesson.generationJobId &&
          typeof recoveredResult?.title === "string" &&
          Array.isArray(recoveredResult?.blocks) &&
          recoveredResult.blocks.length > 0
        ) {
          await updatePendingLessonSyncState(lesson.id, userId, {
            syncStatus: "synced", lastSyncedAt: new Date().toISOString(),
            syncError: undefined, syncRetryAfter: undefined,
            description: "Saved to your cloud library and kept on this device for offline study.",
          });
          synced += 1;
          continue;
        }
      }

      const response = await fetchPendingLessonSync("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: "lesson", learningMode: getLearningMode(), generationMode: "persist",
          generationJobId: lesson.generationJobId, generationLeaseId: leaseId,
          subject: lesson.subject, topic: lesson.generationPrompt,
          difficulty: lesson.difficulty || "medium",
          goal: lesson.generationGoal || "Understand and apply the topic.",
          level: lesson.generationLevel, examBoard: lesson.generationExamBoard,
          generatedLesson: { title: lesson.title, blocks: lesson.blocks, verifiedCurriculumFallback: lesson.generationVerifiedFallback === true },
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.id === lesson.generationJobId && Array.isArray(data?.blocks)) {
        await updatePendingLessonSyncState(lesson.id, userId, {
          syncStatus: "synced", lastSyncedAt: new Date().toISOString(),
          syncError: undefined, syncRetryAfter: undefined,
          description: "Saved to your cloud library and kept on this device for offline study.",
        });
        synced += 1;
      } else {
        const retryCount = (lesson.syncRetryCount || 0) + 1;
        const delay = Math.min(6 * 60 * 60 * 1000, 30_000 * (2 ** Math.min(retryCount - 1, 10)));
        await updatePendingLessonSyncState(lesson.id, userId, {
          syncStatus: "retry-needed", syncRetryCount: retryCount,
          syncRetryAfter: Date.now() + delay,
          syncError: typeof data?.error === "string" ? data.error.slice(0, 240) : `Sync failed (${response.status}).`,
        });
      }
    } catch (error) {
      const retryCount = (lesson.syncRetryCount || 0) + 1;
      const delay = Math.min(6 * 60 * 60 * 1000, 30_000 * (2 ** Math.min(retryCount - 1, 10)));
      await updatePendingLessonSyncState(lesson.id, userId, {
        syncStatus: "retry-needed", syncRetryCount: retryCount,
        syncRetryAfter: Date.now() + delay,
        syncError: error instanceof Error ? error.message.slice(0, 240) : "Network sync failed.",
      });
    }
  }
  const remaining = await offlineStorage.getPendingLessonSync(userId);
  scheduleNextPendingLessonSync(remaining);
  return { synced, pending: remaining.length };
}

let pendingLessonSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** Retry at the earliest persisted backoff deadline even if the tab stays open. */
function scheduleNextPendingLessonSync(lessons: Awaited<ReturnType<typeof offlineStorage.getPendingLessonSync>>) {
  if (!isBrowser()) return;
  if (pendingLessonSyncTimer) clearTimeout(pendingLessonSyncTimer);
  pendingLessonSyncTimer = null;
  if (!navigator.onLine) return;
  const deadlines = lessons
    .filter((lesson) => lesson.syncStatus !== "synced" && typeof lesson.syncRetryAfter === "number")
    .map((lesson) => lesson.syncRetryAfter as number);
  if (!deadlines.length) return;
  const delay = Math.max(1000, Math.min(...deadlines) - Date.now());
  pendingLessonSyncTimer = setTimeout(() => {
    pendingLessonSyncTimer = null;
    void retryPendingGeneratedLessonSync().catch((error) => console.warn("[LEARN] scheduled lesson sync failed", error));
  }, delay);
}

let pendingLessonSyncInFlight: Promise<{ synced: number; pending: number }> | null = null;
const PENDING_LESSON_SYNC_LOCK = "shadecode:pending-generated-lesson-sync:v1";

export function retryPendingGeneratedLessonSync(options: { manual?: boolean } = {}): Promise<{ synced: number; pending: number }> {
  if (pendingLessonSyncInFlight) return pendingLessonSyncInFlight;

  // The module-level promise prevents duplicate work in this tab. Web Locks
  // extends that protection across tabs sharing the same browser profile.
  // The server-side generation lease remains the final concurrency guard.
  const lockManager = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const task = lockManager
    ? lockManager.request(
        PENDING_LESSON_SYNC_LOCK,
        { mode: "exclusive", ifAvailable: true },
        (lock) => lock ? runPendingGeneratedLessonSync(options) : Promise.resolve({ synced: 0, pending: 0 }),
      )
    : runPendingGeneratedLessonSync(options);

  pendingLessonSyncInFlight = task;
  const clearFlight = () => { if (pendingLessonSyncInFlight === task) pendingLessonSyncInFlight = null; };
  void task.then(clearFlight, clearFlight);
  return task;
}

if (isBrowser()) {
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void retryPendingGeneratedLessonSync().catch((error) => console.warn("[LEARN] pending lesson sync could not start", error)); }, 1200);
  };
  window.addEventListener("online", scheduleSync);
  window.addEventListener("focus", scheduleSync);
  if (navigator.onLine) scheduleSync();
}
