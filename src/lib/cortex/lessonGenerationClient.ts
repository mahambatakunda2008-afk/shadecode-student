import { createGenerationJob, getActiveGenerationJobs, getGenerationJobs, hydrateGenerationJobs, markInterruptedJobsForRetry, updateGenerationJob, type GenerationJob } from "@/lib/cortex/generationJob";
import { cortexRuntimeManager } from "@/lib/cortex/runtime/manager";
import { isLocalCortexPrepared } from "@/lib/cortex/runtime/localWebRuntime";
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
function localId() { return isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

/** Turn the model's markdown into lesson blocks without inventing educational content. */
export function parseLocalLesson(text: string, request: LessonGenerationInput): LessonGenerationResult {
  const normalized = text
    .replace(/```(?:markdown|md)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*(?:assistant|cortex)\s*:\s*/i, "")
    .trim();
  const heading = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = heading || `${request.subject}: ${request.prompt}`.slice(0, 140);
  const body = normalized.replace(/^#\s+.+$/m, "").trim();
  const sections = body
    .split(/\n(?=##\s+|###\s+|\d+[.)]\s+|\*\*[^*]+\*\*\s*$)/g)
    .map(section => section.trim())
    .filter(Boolean);
  const blocks = (sections.length ? sections : [body]).map((section, index) => {
    const match = section.match(/^(?:##|###)\s+(.+)\n?([\s\S]*)$/);
    const numbered = section.match(/^\d+[.)]\s+([^\n]+)\n?([\s\S]*)$/);
    const bold = section.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
    const sectionTitle = match?.[1]?.trim() || numbered?.[1]?.trim() || bold?.[1]?.trim();
    const content = (match?.[2] ?? numbered?.[2] ?? bold?.[2] ?? section).trim();
    return {
      type: index === 0 ? "explanation" : "section",
      title: sectionTitle || (index === 0 ? "Lesson" : `Part ${index + 1}`),
      content,
    };
  }).filter(block => block.content.length > 0);
  return { id: localId(), title, blocks };
}

function assessLocalLesson(result: LessonGenerationResult, request: LessonGenerationInput) {
  const content = result.blocks.map(block => String(block.content ?? "")).join("\n");
  const headings = result.blocks.map(block => String(block.title ?? "").toLowerCase()).join(" | ");
  const requiredSignals = ["example", "check", "practice", "mistake", "trap", "summary", "exam"];
  const signalCount = requiredSignals.filter(signal => content.toLowerCase().includes(signal) || headings.includes(signal)).length;
  const topicWords = request.prompt.toLowerCase().split(/\s+/).filter(word => word.length >= 4).slice(0, 5);
  const topicCoverage = topicWords.length === 0 || topicWords.filter(word => content.toLowerCase().includes(word.replace(/[^a-z0-9]/g, ""))).length >= Math.min(2, topicWords.length);
  const substantive = content.length >= 650 && result.blocks.length >= 5;
  return { substantive, signalCount, topicCoverage, passed: substantive && signalCount >= 3 && topicCoverage };
}

async function persistLesson(result: LessonGenerationResult, request: LessonGenerationInput) {
  const now = new Date().toISOString();
  await offlineStorage.saveLesson({
    id: result.id,
    title: result.title,
    subject: request.subject,
    description: `A complete ${request.difficulty} lesson on ${request.prompt}`,
    blocks: result.blocks,
    difficulty: request.difficulty,
    progress: 0,
    completed: false,
    downloadedAt: now,
    lastSyncedAt: now,
    size: JSON.stringify(result).length,
  });
}

async function runLocalJob(job: GenerationJob<LessonGenerationInput>) {
  const runtime = cortexRuntimeManager.get("local-web") ?? cortexRuntimeManager.get("local-native");
  if (!runtime) throw new Error("Local Cortex is not available on this device.");

  if (!isLocalCortexPrepared()) {
    if (!isBrowser() || !navigator.onLine) {
      throw new Error("Local Cortex has not been prepared on this device. Connect once to prepare the local teaching model.");
    }
    updateGenerationJob(job.id, { status: "warming", progress: 2, error: "Preparing Cortex on this device. Your lesson stays on this device." });
    await runtime.warm(progress => {
      updateGenerationJob(job.id, { status: "warming", progress: Math.min(30, Math.max(2, Math.round(progress * 0.3))) });
    });
  }

  if (!(await runtime.isReady())) throw new Error("Local Cortex finished preparation but is not ready yet.");

  let generatedText = "";
  let lastPublishedLength = 0;
  let lastPersistedAt = 0;
  updateGenerationJob(job.id, { status: "generating", progress: 30, error: undefined });
  await runtime.stream({
    system: `You are Cortex, a careful offline tutor. Teach only the requested subject and topic. ${job.request.goal} Write original, accurate teaching content for the learner's level. Start with a # title and use these exact section headings when relevant: ## Core idea, ## Key definitions, ## Worked example, ## Common trap, ## Check yourself, ## Exam application, ## Practice, ## Summary. Cover the core concept, important definitions, formulas with symbols and units when relevant, one worked example with reasoning, a misconception or common trap, a check-yourself question with its answer, exam application when relevant, and progressively harder practice. Be concise but substantive. Never invent syllabus requirements. Do not mention being an AI. Do not pad the lesson with generic motivation. Do not answer a different topic from the learner's request.`,
    prompt: `${job.request.prompt}\n\nEducation level: ${job.request.level || "not specified"}\nExam/curriculum: ${job.request.examBoard || "not specified"}\nDifficulty: ${job.request.difficulty}`,
    maxTokens: job.request.difficulty === "hard" ? 1600 : 1300,
    temperature: 0.2,
  }, chunk => {
    if (chunk.done) return;
    generatedText += chunk.text;
    const now = Date.now();
    if (generatedText.length - lastPublishedLength >= 160) {
      lastPublishedLength = generatedText.length;
      const partial = { text: generatedText, ...parseLocalLesson(generatedText, job.request) };
      updateGenerationJob(job.id, { status: "partial", progress: Math.min(92, 30 + Math.floor(generatedText.length / 55)), partial });
      if (now - lastPersistedAt >= 500) lastPersistedAt = now;
    }
  });

  if (generatedText.trim().length < 40) throw new Error("Local Cortex returned too little content to make a lesson.");
  const result = parseLocalLesson(generatedText, job.request);
  if (result.blocks.length < 2) throw new Error("Local Cortex returned an incomplete lesson. Try again or use cloud enhancement when online.");
  const quality = assessLocalLesson(result, job.request);
  if (!quality.passed) {
    throw new Error(`Local Cortex draft did not meet the lesson quality bar (${result.blocks.length} sections, ${quality.signalCount}/7 quality signals).`);
  }
  await persistLesson(result, job.request);
  updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined, error: undefined });
  if (getActiveId() === job.id) saveActiveId(null);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}

async function runCloudJob(job: GenerationJob<LessonGenerationInput>, token: string) {
  updateGenerationJob(job.id, { status: "generating", progress: Math.max(12, job.progress), error: undefined });
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
  await persistLesson(result, job.request);
  updateGenerationJob(job.id, { status: "complete", progress: 100, result, partial: undefined });
  if (getActiveId() === job.id) saveActiveId(null);
  return getGenerationJobs().find(item => item.id === job.id) ?? job;
}

async function runJob(job: GenerationJob<LessonGenerationInput>, token: string | null) {
  if (runningJobId && runningJobId !== job.id) return getGenerationJobs().find(item => item.id === runningJobId) ?? job;
  runningJobId = job.id;
  saveActiveId(job.id);
  try {
    try {
      return await runLocalJob(job);
    } catch (localError) {
      if (!isBrowser() || !navigator.onLine || !token) throw localError;
      updateGenerationJob(job.id, { status: "warming", progress: Math.max(8, job.progress), error: `Local Cortex draft unavailable. Using cloud fallback: ${errorMessage(localError)}` });
      return await runCloudJob(job, token);
    }
  } catch (error) {
    const offlineNow = isBrowser() && !navigator.onLine;
    updateGenerationJob(job.id, {
      status: offlineNow ? "queued" : "failed",
      progress: offlineNow ? Math.min(job.progress, 20) : job.progress,
      error: offlineNow ? "Local Cortex is not ready yet. Your request is safely queued on this device." : errorMessage(error),
    });
    if (offlineNow) saveActiveId(job.id); else if (getActiveId() === job.id) saveActiveId(null);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  } finally {
    if (runningJobId === job.id) runningJobId = null;
  }
}

export function queueLessonGeneration(input: LessonGenerationInput) {
  const job = createGenerationJob("lesson", input);
  if (isBrowser() && !navigator.onLine) updateGenerationJob(job.id, { status: "queued", progress: 0, error: "Waiting for a connection. Your request is safely queued on this device." });
  return job;
}

export async function resumeLessonGeneration(token: string | null) {
  if (!isBrowser()) return null;
  await hydrateGenerationJobs();
  markInterruptedJobsForRetry();
  const active = getActiveGenerationJobs()
    .filter(job => job.kind === "lesson")
    .map(job => job as GenerationJob<LessonGenerationInput>);
  const preferredId = getActiveId();
  const job = (preferredId && active.find(item => item.id === preferredId)) || active[0];
  if (!job) return null;
  if (!navigator.onLine && !isLocalCortexPrepared()) return job;
  return runJob(job, token);
}

export async function startLessonGeneration(input: LessonGenerationInput, token: string | null) {
  const job = queueLessonGeneration(input);
  if (isBrowser()) {
    void runJob(job, token);
    return getGenerationJobs().find(item => item.id === job.id) ?? job;
  }
  return job;
}
