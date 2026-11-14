type PendingIntervention = {
  id: string;
  subject: string;
  topic: string;
  level: "hint" | "method" | "solution";
  questionFingerprint: string;
  createdAt: string;
  linkedTransferFingerprints?: string[];
};

const KEY_PREFIX = "shadecode:cortex:verify-interventions:v1:";

function keyFor(userId: string) { return KEY_PREFIX + encodeURIComponent(userId); }

function fingerprint(value: string): string {
  // A compact, non-reversible comparison token. The question itself is never stored.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function read(userId: string): PendingIntervention[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item =>
      item && typeof item.id === "string" && typeof item.subject === "string" &&
      typeof item.topic === "string" && ["hint", "method", "solution"].includes(item.level) &&
      typeof item.questionFingerprint === "string" && typeof item.createdAt === "string" &&
      (item.linkedTransferFingerprints === undefined || (Array.isArray(item.linkedTransferFingerprints) && item.linkedTransferFingerprints.every((value: unknown) => typeof value === "string"))),
    ).filter(item => {
      const createdAt = Date.parse(item.createdAt);
      return Number.isFinite(createdAt) && Date.now() - createdAt <= 14 * 86_400_000;
    }).slice(-20) : [];
  } catch { return []; }
}

function write(userId: string, items: PendingIntervention[]) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify(items.slice(-20))); } catch {}
}

/** Record that help was delivered. Stores no question, answer, image or explanation text. */
export function recordVerifyIntervention(input: {
  userId: string; subject?: string; topic?: string; level: "hint" | "method" | "solution"; question?: string;
  id?: string; occurredAt?: string;
}) {
  if (typeof window === "undefined" || !input.userId || !input.subject?.trim() || !input.topic?.trim() || !input.question?.trim()) return;
  const now = input.occurredAt || new Date().toISOString();
  const next: PendingIntervention = {
    id: input.id || `vi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
    subject: input.subject.trim().slice(0, 100),
    topic: input.topic.trim().slice(0, 100),
    level: input.level,
    questionFingerprint: fingerprint(input.question.trim().replace(/\s+/g, " ").toLocaleLowerCase("en")),
    createdAt: now,
  };
  write(input.userId, [...read(input.userId), next]);
}

/**
 * Link a short sequence of marked attempts for this subject/topic. Only distinct
 * fresh questions count toward the two-attempt outcome window; identical questions
 * remain linked as non-transfer evidence but do not advance that window.
 */
export function consumeVerifyIntervention(input: {
  userId: string; subject?: string; topic?: string; question?: string; occurredAt?: string;
}): null | { interventionId: string; interventionLevel: string; interventionToAttemptHours: number; freshTransfer: boolean } {
  if (typeof window === "undefined" || !input.userId || !input.subject || !input.topic || !input.question?.trim()) return null;
  const items = read(input.userId);
  const subject = input.subject.trim().toLocaleLowerCase("en");
  const topic = input.topic.trim().toLocaleLowerCase("en");
  const index = items.map((item, i) => ({ item, i })).reverse().find(({ item }) =>
    item.subject.toLocaleLowerCase("en") === subject &&
    item.topic.toLocaleLowerCase("en") === topic,
  );
  if (!index) return null;
  const attemptTime = Date.parse(input.occurredAt || new Date().toISOString());
  const interventionTime = Date.parse(index.item.createdAt);
  if (!Number.isFinite(attemptTime) || !Number.isFinite(interventionTime) || attemptTime < interventionTime) return null;
  const questionKey = fingerprint(input.question.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"));
  const linked = index.item.linkedTransferFingerprints || [];
  const freshTransfer = questionKey !== index.item.questionFingerprint && !linked.includes(questionKey);
  if (freshTransfer) linked.push(questionKey);
  const remaining = items.filter((_, i) => i !== index.i);
  if (linked.length < 2) {
    remaining.push({ ...index.item, linkedTransferFingerprints: linked });
  }
  write(input.userId, remaining);
  return {
    interventionId: index.item.id,
    interventionLevel: index.item.level,
    interventionToAttemptHours: Math.round(((attemptTime - interventionTime) / 3_600_000) * 10) / 10,
    freshTransfer,
  };
}
