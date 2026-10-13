import { createGenerationJob, getActiveGenerationJobs, getGenerationJob, getGenerationJobs, markInterruptedJobsForRetry, restoreGenerationJob, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
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
import { getDurableGenerationJob, listDurableGenerationJobs, syncDurableGenerationJob } from "@/lib/cortex/durableGenerationJob";
import { generateBrowserLocal, getBrowserLocalModelStatus, subscribeBrowserLocalModelStatus } from "@/lib/cortex/localModel";
import { chooseHybridExecutionMode, firstSuccessful } from "@/lib/cortex/hybridRuntime";
import { classifyCortexExecutionFailure } from "@/lib/cortex/runtime/executionEvents";
import { getCortexRecoveryPolicy } from "@/lib/cortex/runtime/recovery";
import { buildLocalSectionRequirements } from "@/lib/cortex/localLessonPlan";
import { buildDeterministicLessonFallback } from "@/lib/cortex/lessonFallback";

export interface LessonGenerationInput { prompt: string; subject: string; difficulty: "easy" | "medium" | "hard"; goal: string; level?: string; examBoard?: string; }
interface LessonGenerationResult { id: string; title: string; blocks: Array<Record<string, unknown>>; offlineFallback?: boolean; localModel?: boolean; }
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
function saveActiveId(id: string | null) { if (!isBrowser()) return; try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch {} }
function getActiveId() { if (!isBrowser()) return null; try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function errorMessage(value: unknown) { return value instanceof Error ? value.message : "Lesson generation failed."; }
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
  await offlineStorage.saveLesson({ id: result.id, title: result.title, subject: job.request.subject, description: generated?.offlineFallback ? `Curated curriculum recovery lesson on ${job.request.prompt}. This lesson uses authored material while AI generation is unavailable.` : generated?.localModel ? `Locally generated Cortex lesson for ${job.request.prompt}` : `Offline curriculum lesson for ${job.request.prompt}`, blocks: result.blocks, difficulty: job.request.difficulty, progress: 0, completed: false, downloadedAt: now, lastSyncedAt: now, size: JSON.stringify(result).length });
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

  const context = localContext(job);
  const resolved = buildResolvedLessonPrompt(request);
  const crossDeviceMemory = await readCrossDeviceLearnerMemory(token, job.request.subject, request.topic);
  const learnerContext = [localContext(job), crossDeviceMemory].filter(Boolean).join("\n\n");
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
  // Durable jobs remain lease-owned when recovery switches from cloud to browser-local generation.
  const effectiveLeaseId = leaseId ?? generationLeaseId(job.id);
  const response = await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: "lesson",
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
        title: generated.title,
        blocks: generated.blocks,
        verifiedCurriculumFallback: generated.offlineFallback === true,
      },
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id || !Array.isArray(data?.blocks)) {
    throw new Error(data?.error || `Lesson persistence failed (${response.status})`);
  }
  const persisted: LessonGenerationResult = {
    id: String(data.id),
    title: String(data.title || generated.title),
    blocks: data.blocks as Array<Record<string, unknown>>,
    localModel: generated.localModel,
    offlineFallback: generated.offlineFallback,
  };
  updateGenerationJob(job.id, { status: "complete", progress: 100, result: persisted, partial: undefined, error: undefined });
  if (getActiveId() === job.id) saveActiveId(null);
  openCompletedLesson(persisted);
  return persisted;
}

async function tryCloudLesson(job: GenerationJob<LessonGenerationInput>, token: string): Promise<LessonGenerationResult | null> {
    let data: any = null;
    let lastError: unknown = null;
    const request = resolvedRequest(job);
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
              : (sectionData?.error || `Section generation failed (${response.status})`)
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
      title: assembledTitle,
      blocks: assembledBlocks,
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
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id; saveActiveId(job.id); updateGenerationJob(job.id, { status: "warming", progress: 5, error: undefined });
  let localModelAttempted = false;
  try {
    rememberLocalTopic(job.request.prompt);
    updateGenerationJob(job.id, {
      status: "generating",
      progress: 15,
      error: "Cortex is selecting the best available generation lane…",
    });
    const online = isBrowser() ? navigator.onLine : false;
    const localStatus = isBrowser() ? getBrowserLocalModelStatus().status : "unsupported";
    const localReady = localStatus === "ready";
    const hybrid = chooseHybridExecutionMode({
      online,
      browserModelReady: localReady,
      browserModelAvailable: localStatus !== "unsupported",
      cloudAvailable: online,
      peerAvailable: false,
    }, "deep");

    // Verified curriculum recovery is the fast path. If the device already has
    // authoritative curriculum data for this request, use it immediately instead
    // of making the learner wait for a cloud provider just to discover that the
    // provider is unavailable. This removes the old 20% -> provider timeout ->
    // 24% recovery staircase for supported cached topics.
    if (isBrowser() && hasLocalLessonFallback(job.request.subject, job.request.prompt, localContext(job))) {
      try {
        updateGenerationJob(job.id, {
          status: "generating",
          progress: 10,
          error: "Cortex is using verified curriculum recovery while online generation is unavailable or warming up.",
        });
        const local = generateLocalLesson(job.request.subject, job.request.prompt, localContext(job));
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
          if (token && online) {
            await syncDurableGenerationJob(
              token,
              (getGenerationJob(job.id) ?? finished) as GenerationJob,
              "complete",
            );
          }
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (error) {
        console.warn("[LEARN] fast verified curriculum recovery failed", error instanceof Error ? error.message : String(error));
      }
    }

    // Only a warm local model may enter the speculative race. We never trigger
    // a large first-load model download merely to duplicate a cloud request.
    if (hybrid.mode === "parallel") {
      localModelAttempted = true;
      const localLane = tryLocalModel(job, token, false).then((result) => {
        if (!result) throw new Error("Browser-local Cortex lane produced no valid lesson.");
        return result;
      });
      const cloudLane = tryCloudLesson(job, token).then((result) => {
        if (!result) throw new Error("Cloud Cortex lane produced no valid lesson.");
        return result;
      });

      const winner = await firstSuccessful([localLane, cloudLane]);

      // A browser-local winner is still a real generated lesson. When the
      // learner is online and authenticated, never strand it in IndexedDB.
      // The parallel lane used to call saveLocalResult() unconditionally,
      // which is exactly how valid local Cortex lessons ended up as
      // "saving on this device" even though the user was online.
      const finished = token && online
        ? await persistGeneratedLesson(job, winner, token)
        : await saveLocalResult(job, winner);

      if (token && online) {
        await syncDurableGenerationJob(
          token,
          (getGenerationJob(job.id) ?? finished) as GenerationJob,
          "complete",
        );
      }
      return finished;
    }

    if (hybrid.mode === "local") {
      localModelAttempted = true;
      const localModel = await tryLocalModel(job, token);
      if (localModel) {
        if (token) {
          const finished = await persistGeneratedLesson(job, localModel, token);
          await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
        return saveLocalResult(job, localModel);
      }
    }

    // Cloud and browser-local inference are independent lanes. A provider exception
    // must not jump directly to the outer failure handler and skip local recovery.
    if (hybrid.mode === "cloud" || hybrid.mode === "parallel-prep") {
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
        await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
        return getGenerationJobs().find(item => item.id === job.id) ?? job;
      }

      let localFailure: unknown = null;
      if (localStatus !== "unsupported" || hybrid.mode === "parallel-prep") {
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
              await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
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
      await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
      return finished;
    }

    throw new Error("All online lesson generation lanes failed.");
  } catch (error) {
    // Use the latest stored job because section generation updates its checkpoint in storage.
    const currentJob = (getGenerationJob(job.id) ?? job) as GenerationJob<LessonGenerationInput>;
    const message = errorMessage(error); const context = localContext(currentJob as GenerationJob<LessonGenerationInput>);
    const failureClass = classifyCortexExecutionFailure(error);
    const recoveryPolicy = getCortexRecoveryPolicy(failureClass, {
      hasVerifiedData: isBrowser() && hasLocalLessonFallback(currentJob.request.subject, currentJob.request.prompt, context),
      hasWarmLocal: !localModelAttempted && isBrowser() && getBrowserLocalModelStatus().status === "ready",
      hasCheckpoint: (() => {
        const partial = currentJob.partial;
        if (!partial || typeof partial !== "object") return false;
        const checkpoint = partial as Record<string, unknown>;
        // A pre-request progress marker has completedUnits: 0 and no blocks.
        // It is not a recovery checkpoint: resuming it would repeat the same
        // first-section failure and recreate the 20% -> 24% wait cycle.
        return typeof checkpoint.completedUnits === "number" && checkpoint.completedUnits > 0
          && Array.isArray(checkpoint.blocks) && checkpoint.blocks.length > 0;
      })(),
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

    // If both the cloud and browser-local lanes fail, use only an exact hand-authored
    // lesson whose subject/topic key matches this request. This recovery is deliberately
    // after the provider/local attempts, so curated material never replaces successful AI
    // generation. It also avoids depending on the server section fallback being reachable.
    const curatedFallback = buildDeterministicLessonFallback(
      currentJob.request.subject,
      currentJob.request.prompt,
    );
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
          ? await persistGeneratedLesson(
              currentJob as GenerationJob<LessonGenerationInput>,
              fallbackResult,
              token,
              generationLeaseId(currentJob.id),
            )
          : await saveLocalResult(currentJob as GenerationJob<LessonGenerationInput>, fallbackResult);

        if (canPersist) {
          await syncDurableGenerationJob(
            token,
            (getGenerationJob(currentJob.id) ?? finished) as GenerationJob,
            "complete",
          );
        }
        console.info("[LEARN] recovered with exact curated lesson after generation lanes failed", {
          topic: resolvedRequest(currentJob as GenerationJob<LessonGenerationInput>).topic,
          failureClass,
        });
        return getGenerationJobs().find(item => item.id === currentJob.id) ?? finished;
      } catch (curatedRecoveryError) {
        console.warn("[LEARN] exact curated recovery could not be saved", {
          topic: currentJob.request.prompt,
          error: curatedRecoveryError instanceof Error ? curatedRecoveryError.message : String(curatedRecoveryError),
        });
      }
    }

    // Cortex recovery policy selects exactly one safe recovery lane. The browser
    // runner executes that decision, but never invents a generic whole-job retry.
    if (recoveryPolicy.action === "resume_checkpoint" && allowCheckpointResume) {
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
    if (recoveryPolicy.action === "use_verified_data" && isBrowser() && navigator.onLine && hasLocalLessonFallback(job.request.subject, job.request.prompt, context)) {
      try {
        const local = generateLocalLesson(job.request.subject, job.request.prompt, context);
        if (local.blocks.length >= 10) {
          updateGenerationJob(job.id, { status: "generating", progress: Math.max(26, Math.min(40, getGenerationJob(job.id)?.progress ?? 26)), error: "Cloud generation is unavailable. Cortex is switching to verified curriculum recovery." });
          const localFallback: LessonGenerationResult = { id: local.id, title: local.title, blocks: local.blocks, offlineFallback: true, localModel: false };
          const finished = token ? await persistGeneratedLesson(job, localFallback, token, generationLeaseId(job.id)) : await saveLocalResult(job, localFallback);
          if (token) await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (fallbackError) {
        console.warn("[LEARN] verified curriculum recovery failed", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      }
    }

    if (recoveryPolicy.action === "use_warm_local" && isBrowser() && navigator.onLine && getBrowserLocalModelStatus().status === "ready") {
      try {
        updateGenerationJob(job.id, { status: "generating", progress: Math.max(40, Math.min(55, getGenerationJob(job.id)?.progress ?? 40)), error: "Cloud generation is unavailable. Cortex is using the warm browser-local model." });
        localModelAttempted = true;
        const localModel = await runLocalRecoveryWithHeartbeat(job, token, () => tryLocalModel(job, token));
        if (localModel) {
          const finished = token ? await persistGeneratedLesson(job, localModel, token, generationLeaseId(job.id)) : await saveLocalResult(job, localModel);
          if (token) await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
          return getGenerationJobs().find(item => item.id === job.id) ?? job;
        }
      } catch (localModelError) {
        console.warn("[LEARN] warm browser-local recovery failed", localModelError instanceof Error ? localModelError.message : String(localModelError));
      }
    }

    if (recoveryPolicy.action === "use_verified_data" && isBrowser() && hasLocalLessonFallback(job.request.subject, job.request.prompt, context)) {
      try {
        // An online provider failure is not an offline-storage success.
        // Build from the verified local curriculum lane, then use the same
        // server persistence path so the lesson is not stranded on one device.
        const localFallback = await (async () => {
          const request = resolvedRequest(job);
          const local = generateLocalLesson(job.request.subject, job.request.prompt, context);
          const validated = validateResult(
            { id: local.id, title: local.title, blocks: local.blocks },
            request,
          );
          if (!validated) throw new Error("Local curriculum fallback failed the learning-quality checks.");
          return { ...validated, offlineFallback: false, localModel: false };
        })();

        if (token && navigator.onLine) {
          const finished = await persistGeneratedLesson(job, localFallback, token, generationLeaseId(job.id));
          await syncDurableGenerationJob(token, (getGenerationJob(job.id) ?? finished) as GenerationJob, "complete");
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
  } finally { if (runningJobId === job.id) runningJobId = null; }
}
export function queueLessonGeneration(input: LessonGenerationInput) { return createGenerationJob("lesson", input); }
export async function resumeLessonGeneration(token: string | null) { if (!isBrowser() || !token) return null; markInterruptedJobsForRetry(); let active = getActiveGenerationJobs().filter(job => job.kind === "lesson").map(job => job as GenerationJob<LessonGenerationInput>); const preferredId = getActiveId(); let job = (preferredId && active.find(item => item.id === preferredId)) || active[0]; if (!job) { const durable = await listDurableGenerationJobs(token); const remote = durable.find((item) => { const row = item as Record<string, unknown>; return row.kind === "lesson" && row.request && typeof row.request === "object"; }) as Record<string, unknown> | undefined; if (remote) {
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
