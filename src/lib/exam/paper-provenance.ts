import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type ExamPaperSource = "cortex" | "deterministic-engine" | "curated-bank";

export interface ExamPaperProvenanceInput {
  userId: string;
  subject: string;
  subjectId: string;
  difficulty: string;
  source: ExamPaperSource;
  questions: unknown[];
}

interface ExamPaperProofPayload {
  version: 2;
  issuer: "shadecode-exam";
  userId: string;
  subject: string;
  subjectId: string;
  difficulty: string;
  source: ExamPaperSource;
  paperDigest: string;
  issuedAt: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function signingSecret(): string | null {
  // Dedicated key takes precedence. The server-only Supabase service key is a
  // stable high-entropy fallback so deployments do not silently lose signing.
  return process.env.EXAM_PAPER_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function digestQuestions(questions: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(questions))).digest("hex");
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function signExamPaper(
  input: ExamPaperProvenanceInput,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
): string | null {
  const secret = signingSecret();
  if (!secret || !input.userId || !input.subject || !input.subjectId || !input.questions.length) return null;
  const payload: ExamPaperProofPayload = {
    version: 2,
    issuer: "shadecode-exam",
    userId: input.userId,
    subject: input.subject,
    subjectId: input.subjectId,
    difficulty: input.difficulty,
    source: input.source,
    paperDigest: digestQuestions(input.questions),
    issuedAt: now,
    expiresAt: now + Math.max(60_000, Math.min(ttlMs, DEFAULT_TTL_MS)),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyExamPaperProof(
  token: unknown,
  input: ExamPaperProvenanceInput,
  now = Date.now(),
): { valid: true; source: ExamPaperSource; issuedAt: number; expiresAt: number } | { valid: false } {
  const secret = signingSecret();
  if (!secret || typeof token !== "string" || token.length > 12_000) return { valid: false };
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra !== undefined) return { valid: false };

  let expected: Buffer;
  let supplied: Buffer;
  try {
    expected = Buffer.from(signature(encoded, secret), "base64url");
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return { valid: false };
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return { valid: false };

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ExamPaperProofPayload;
    if (
      payload.version !== 2 ||
      payload.issuer !== "shadecode-exam" ||
      payload.userId !== input.userId ||
      payload.subject !== input.subject ||
      payload.subjectId !== input.subjectId ||
      payload.difficulty !== input.difficulty ||
      payload.paperDigest !== digestQuestions(input.questions) ||
      !Number.isFinite(payload.issuedAt) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now ||
      payload.expiresAt <= payload.issuedAt ||
      !["cortex", "deterministic-engine", "curated-bank"].includes(payload.source)
    ) return { valid: false };

    return { valid: true, source: payload.source, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt };
  } catch {
    return { valid: false };
  }
}
