import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSubjectKey } from "@/lib/academic/subjectContract";

export interface SharedArtifactKeyInput {
  artifactType: string;
  subject: string;
  topic: string;
  difficulty?: string | null;
  level?: string | null;
  examBoard?: string | null;
  goal?: string | null;
  contentVersion?: number;
}

export interface SharedArtifactRecord {
  id: string;
  payload: Record<string, unknown>;
  qualityScore: number;
}

export interface ShareableLessonPayload {
  title: string;
  blocks: Array<Record<string, unknown>>;
}

function normalizeKeyText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Stable, versioned identity for generic reusable learning artifacts. */
export function buildSharedArtifactCacheKey(input: SharedArtifactKeyInput): string {
  const canonical = JSON.stringify({
    schema: 1,
    artifactType: normalizeKeyText(input.artifactType),
    subject: normalizeSubjectKey(input.subject),
    topic: normalizeKeyText(input.topic),
    difficulty: normalizeKeyText(input.difficulty),
    level: normalizeKeyText(input.level),
    examBoard: normalizeKeyText(input.examBoard),
    goal: normalizeKeyText(input.goal),
    contentVersion: input.contentVersion ?? 1,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Shared artifacts contain educational content only, never source-user identity,
 * progress, answers, memory records, or personal notes. This conservative guard
 * rejects obvious personal prompts and identifiers before a lesson is published.
 */
export function isSafeToShareLesson(topic: string, payload: ShareableLessonPayload): boolean {
  const text = [
    topic,
    payload.title,
    ...payload.blocks.map((block) => [
      typeof block.title === "string" ? block.title : "",
      typeof block.content === "string" ? block.content : "",
    ].join(" ")),
  ].join("\n");

  if (/\b(my|me|i|we|our)\b/i.test(topic)) return false;
  if (/\b(my name is|my school is|my phone|my email|my address|my grades|my marks|my teacher|my classmate|i am called|i live at|i study at)\b/i.test(topic)) return false;
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return false;
  if (/(?:\+?\d[\d\s().-]{7,}\d)/.test(text)) return false;
  if (/\b(you told me|your previous score|your previous grades|your personal history|based on your private|i remember you|your school account|your personal notes|your learning history)\b/i.test(text)) return false;
  return payload.title.trim().length > 0 && payload.blocks.length >= 10 &&
    payload.blocks.every((block) => typeof block.type === "string" &&
      typeof block.content === "string" && block.content.trim().length >= 40);
}

export async function findSharedArtifact(
  client: SupabaseClient,
  input: SharedArtifactKeyInput,
): Promise<SharedArtifactRecord | null> {
  try {
    const cacheKey = buildSharedArtifactCacheKey(input);
    const { data, error } = await client
      .from("shared_learning_artifacts")
      .select("id, payload, quality_score, use_count")
      .eq("artifact_type", normalizeKeyText(input.artifactType))
      .eq("cache_key", cacheKey)
      .eq("status", "verified")
      .gte("quality_score", 60)
      .maybeSingle();

    // Missing migration/table or a temporary database issue must not prevent normal generation.
    if (error || !data || !data.payload || typeof data.payload !== "object") return null;

    void (async () => {
      try {
        await client.from("shared_learning_artifacts")
          .update({ use_count: Math.max(0, Number(data.use_count) || 0) + 1 })
          .eq("id", data.id);
      } catch {
        // Usage telemetry is best-effort; a hit remains usable if it cannot be counted.
      }
    })();

    return {
      id: String(data.id),
      payload: data.payload as Record<string, unknown>,
      qualityScore: Number(data.quality_score) || 0,
    };
  } catch {
    return null;
  }
}

export async function publishSharedArtifact(
  client: SupabaseClient,
  input: SharedArtifactKeyInput & {
    payload: Record<string, unknown>;
    qualityScore: number;
    shareable: boolean;
  },
): Promise<boolean> {
  // Enable each artifact type only after its own schema and safety validator exist.
  if (input.artifactType !== "lesson") return false;
  if (!input.shareable || !Number.isFinite(input.qualityScore) || input.qualityScore < 60) return false;
  if (input.artifactType === "lesson") {
    const payload = input.payload as unknown as ShareableLessonPayload;
    if (!isSafeToShareLesson(input.topic, payload)) return false;
  }

  try {
    const { error } = await client.from("shared_learning_artifacts").upsert({
      artifact_type: normalizeKeyText(input.artifactType),
      cache_key: buildSharedArtifactCacheKey(input),
      subject_key: normalizeSubjectKey(input.subject),
      topic_key: createHash("sha256").update(normalizeKeyText(input.topic)).digest("hex"),
      difficulty: normalizeKeyText(input.difficulty) || null,
      level_key: normalizeKeyText(input.level) || null,
      exam_board_key: normalizeKeyText(input.examBoard) || null,
      content_version: input.contentVersion ?? 1,
      payload: input.payload,
      quality_score: Math.round(input.qualityScore),
      status: "verified",
    }, { onConflict: "artifact_type,cache_key", ignoreDuplicates: true });

    if (error) {
      console.warn("[SHARED_ARTIFACTS] publish skipped", { artifactType: input.artifactType, error: error.message });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[SHARED_ARTIFACTS] publish unavailable", {
      artifactType: input.artifactType,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function findSharedLessonArtifact(
  client: SupabaseClient,
  input: Omit<SharedArtifactKeyInput, "artifactType">,
): Promise<(SharedArtifactRecord & { lesson: ShareableLessonPayload }) | null> {
  const record = await findSharedArtifact(client, { ...input, artifactType: "lesson" });
  if (!record) return null;
  const title = record.payload.title;
  const rawBlocks = record.payload.blocks;
  if (typeof title !== "string" || !Array.isArray(rawBlocks)) return null;
  const blocks = rawBlocks.filter((block): block is Record<string, unknown> =>
    Boolean(block) && typeof block === "object" &&
    typeof (block as Record<string, unknown>).type === "string" &&
    typeof (block as Record<string, unknown>).content === "string" &&
    String((block as Record<string, unknown>).content).trim().length >= 40);
  const lesson = { title, blocks };
  if (!isSafeToShareLesson(input.topic, lesson)) return null;
  return { ...record, lesson };
}

export async function publishSharedLessonArtifact(
  client: SupabaseClient,
  input: Omit<SharedArtifactKeyInput, "artifactType"> & {
    lesson: ShareableLessonPayload;
    qualityScore: number;
    shareable: boolean;
  },
): Promise<boolean> {
  return publishSharedArtifact(client, {
    ...input,
    artifactType: "lesson",
    payload: { title: input.lesson.title, blocks: input.lesson.blocks },
  });
}
