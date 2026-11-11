/**
 * Everything a teacher can review, in one shape. Pure and shared by server and client.
 * Question-bank items come from code; lesson items come from the shared lesson library.
 * A review is tied to a content hash, so editing an item makes earlier reviews stale automatically.
 */
import { allReviewableQuestions, contentHash, REVIEW_BANKS } from "@/lib/exam/curated/registry";

export interface ReviewItem {
  id: string;
  /** Tab / bucket: a question-bank id or "lesson". */
  group: string;
  groupLabel: string;
  topic: string;
  title: string;
  /** Multiple-choice items only. */
  options?: string[];
  answer?: string;
  /** Lessons and tutorials: flattened readable text of the blocks. */
  body?: string;
  /** Images and videos in the blocks, so reviewers can see them. */
  media?: ReviewMedia[];
  author?: string;
}

export interface ReviewMedia {
  kind: "image" | "video";
  url: string;
  label: string;
}

export const LESSON_GROUP = { id: "lesson", label: "Lessons" } as const;
export const TUTORIAL_GROUP = { id: "tutorial", label: "Tutorials" } as const;

export const REVIEW_GROUPS: { id: string; label: string }[] = [
  ...REVIEW_BANKS.map((b) => ({ id: b.id, label: b.label })),
  LESSON_GROUP,
  TUTORIAL_GROUP,
];

export function questionItems(): ReviewItem[] {
  return allReviewableQuestions().map((q) => ({
    id: q.id,
    group: q.bank,
    groupLabel: q.bankLabel,
    topic: q.topic,
    title: q.question,
    options: q.options,
    answer: q.answer,
  }));
}

export interface LessonRow {
  id: string;
  title: string | null;
  topic: string | null;
  subject: string | null;
  blocks: unknown;
}

const BODY_LIMIT = 8000;

/** Flattens lesson blocks to readable text. Image/diagram blocks show their caption so reviewers know media exists. */
export function lessonBody(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Record<string, unknown>;
    const title = typeof block.title === "string" ? block.title.trim() : "";
    const content = typeof block.content === "string" ? block.content.trim() : "";
    const isMedia = block.type === "image" || block.type === "diagram" || block.type === "sketch" || block.type === "video";
    const alt = typeof block.alt === "string" ? block.alt : typeof block.caption === "string" ? block.caption : typeof block.title === "string" && block.type === "video" ? block.title : "";
    if (title && block.type !== "video") parts.push(title.toUpperCase());
    if (content) parts.push(content);
    if (isMedia) parts.push(`[${String(block.type)}${alt ? `: ${alt}` : ""}]`);
  }
  const text = parts.join("\n\n");
  return text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}\n\n… (truncated)` : text;
}

/** Images and videos found in a block list, for the reviewer to look at. */
export function blockMedia(blocks: unknown): ReviewMedia[] {
  if (!Array.isArray(blocks)) return [];
  const out: ReviewMedia[] = [];
  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    if (b.type === "image" && typeof b.url === "string") out.push({ kind: "image", url: b.url, label: typeof b.alt === "string" ? b.alt : "" });
    if (b.type === "video" && typeof b.embedUrl === "string") out.push({ kind: "video", url: b.embedUrl, label: typeof b.title === "string" ? b.title : "" });
  }
  return out;
}

export function lessonReviewId(row: LessonRow): string {
  return `lesson-${row.id}-${contentHash(`${row.title ?? ""}\u241f${JSON.stringify(row.blocks ?? null)}`)}`;
}

/** The lesson UUID inside a review id, or null if the id is not a lesson id. */
export function parseLessonReviewId(id: string): string | null {
  const match = /^lesson-([0-9a-f-]{36})-[0-9a-z]+$/.exec(id);
  return match ? match[1] : null;
}

export function lessonItem(row: LessonRow): ReviewItem {
  return {
    id: lessonReviewId(row),
    group: LESSON_GROUP.id,
    groupLabel: LESSON_GROUP.label,
    topic: [row.subject, row.topic].filter(Boolean).join(" · ") || "General",
    title: row.title?.trim() || "Untitled lesson",
    body: lessonBody(row.blocks),
    media: blockMedia(row.blocks),
  };
}

export interface TutorialItemRow {
  id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  blocks: unknown;
}

export function tutorialItem(row: TutorialItemRow, id: string): ReviewItem {
  return {
    id,
    group: TUTORIAL_GROUP.id,
    groupLabel: TUTORIAL_GROUP.label,
    topic: [row.subject, row.topic].filter(Boolean).join(" · ") || "General",
    title: row.title,
    body: lessonBody(row.blocks),
    media: blockMedia(row.blocks),
  };
}
