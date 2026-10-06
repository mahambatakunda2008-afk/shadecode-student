/**
 * src/lib/topicMastery/curriculumLink.ts
 *
 * Server-side bridge: resolves a free-text (subject, topic) to the verified
 * curriculum subsection columns stored on `topic_mastery`.
 *
 * Failure-safe by design: any error returns no link, so a lookup problem can
 * never block a student's mastery write.
 */

import { buildTopicIndex, isSupportedLevel, resolveTopic, type CurriculumTopicUnit, type PaperScope, type TopicIndex } from "./resolver";

interface UnitsClient {
  from(table: "curriculum_topic_units"): {
    select(columns: string): PromiseLike<{ data: unknown[] | null; error: unknown }>;
  };
}

export interface CurriculumLink {
  syllabus_id: string;
  curriculum_topic_key: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
let cached: { index: TopicIndex; loadedAt: number } | null = null;

export function resetCurriculumLinkCache() {
  cached = null;
}

async function loadIndex(client: UnitsClient, now: number): Promise<TopicIndex | null> {
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) return cached.index;

  const { data, error } = await client.from("curriculum_topic_units").select("syllabus_id, subject_id, topic_key, title, level");
  if (error || !data?.length) return cached?.index ?? null;

  const units: CurriculumTopicUnit[] = (data as Array<Record<string, unknown>>)
    .filter((row) => row.syllabus_id && row.subject_id && row.topic_key && row.title)
    .map((row) => ({
      syllabusId: String(row.syllabus_id),
      subjectId: String(row.subject_id),
      topicKey: String(row.topic_key),
      title: String(row.title),
      level: row.level ? String(row.level) : undefined,
    }));

  cached = { index: buildTopicIndex(units), loadedAt: now };
  return cached.index;
}

/**
 * Returns the columns to merge into a topic_mastery upsert, or `{}` when the
 * topic cannot be resolved unambiguously. `{}` (not nulls) is intentional so a
 * later unresolved attempt never erases an earlier resolved key.
 */
export async function resolveCurriculumLink(
  client: UnitsClient,
  subject: string,
  topic: string,
  level?: string | null,
  scope?: PaperScope | null,
  now: number = Date.now(),
): Promise<CurriculumLink | Record<string, never>> {
  try {
    if (!isSupportedLevel(level)) return {};
    const index = await loadIndex(client, now);
    if (!index) return {};
    const result = resolveTopic(topic, subject, index, scope);
    if (result.status !== "resolved") return {};
    return { syllabus_id: result.unit.syllabusId, curriculum_topic_key: result.unit.topicKey };
  } catch {
    return {};
  }
}
