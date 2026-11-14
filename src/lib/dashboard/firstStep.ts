/**
 * src/lib/dashboard/firstStep.ts
 *
 * Parses /api/learn/next-objective into the one real syllabus topic a brand-new
 * student should start with. Anything that is not a verified, fully described
 * objective returns null so the dashboard falls back to a generic prompt and
 * never invents syllabus content.
 */

export interface FirstStep {
  subject: string;
  topic: string;
  title: string;
  description: string | null;
}

const MAX_DESCRIPTION = 140;
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseFirstStep(payload: unknown): FirstStep | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { available?: unknown; subject?: unknown; objective?: unknown };
  if (body.available !== true) return null;
  const subject = text(body.subject, 80);
  const objective = body.objective as { title?: unknown; topic?: unknown; description?: unknown } | null | undefined;
  const title = text(objective?.title, 160);
  if (!subject || !title) return null;
  const topic = text(objective?.topic, 160) || title;
  const raw = text(objective?.description, 600);
  const description = raw ? (raw.length > MAX_DESCRIPTION ? `${raw.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : raw) : null;
  return { subject, topic, title, description };
}

export function firstStepHref(step: FirstStep): string {
  return `/learn?subject=${encodeURIComponent(step.subject)}&topic=${encodeURIComponent(step.topic)}`;
}
