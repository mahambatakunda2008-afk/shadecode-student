import type {
  MarkingResourceAccess,
  MarkingResourceEvidence,
  MarkingResourceKind,
  MarkingResourceReuse,
} from "./marking-resource";

export const MAX_MARKING_RESOURCE_BYTES = 20 * 1024 * 1024;

export type MarkingResourceImportInput = {
  file: File;
  title?: string;
  kind: MarkingResourceKind;
  boardId: string;
  qualificationId: string;
  level: string;
  subjectId: string;
  syllabusId: string;
  syllabusVersion: string;
  examYear?: number;
  paperComponentId?: string;
  reuse?: MarkingResourceReuse;
  attribution?: string;
  sourceUrl?: string;
  notes?: string;
};

export type ImportedMarkingResource = MarkingResourceEvidence & {
  ownerId: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  fileBlob: Blob;
  extractionStatus: "pending";
  extractionWarnings: string[];
};

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ACCEPTED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "docx", "txt"]);

function clean(value: string, label: string, max = 160): string {
  const normalized = value.trim().slice(0, max);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export async function prepareMarkingResourceImport(
  ownerId: string,
  input: MarkingResourceImportInput,
): Promise<ImportedMarkingResource> {
  const owner = clean(ownerId, "Signed-in account", 128);
  const file = input.file;
  if (!(file instanceof Blob) || file.size === 0) throw new Error("Choose a non-empty resource file.");
  if (file.size > MAX_MARKING_RESOURCE_BYTES) throw new Error("Resource files must be 20 MB or smaller.");
  const ext = extension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(ext) || (file.type && !ACCEPTED_MIME_TYPES.has(file.type))) {
    throw new Error("Supported resource files are PDF, JPG, PNG, WEBP, DOCX and TXT.");
  }
  if (ext === "pdf" && file.type && file.type !== "application/pdf") throw new Error("The file extension and detected type do not match.");
  if (ext === "docx" && file.type && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    throw new Error("The file extension and detected type do not match.");
  }
  const requiredIdentity = {
    boardId: clean(input.boardId, "Exam board", 80),
    qualificationId: clean(input.qualificationId, "Qualification", 80),
    level: clean(input.level, "Level", 80),
    subjectId: clean(input.subjectId, "Subject", 100),
    syllabusId: clean(input.syllabusId, "Syllabus", 120),
    syllabusVersion: clean(input.syllabusVersion, "Syllabus version", 80),
    ...(input.examYear ? { examYear: input.examYear } : {}),
    ...(input.paperComponentId?.trim() ? { paperComponentId: input.paperComponentId.trim().slice(0, 100) } : {}),
  };
  if (input.examYear !== undefined && (!Number.isInteger(input.examYear) || input.examYear < 1990 || input.examYear > 2200)) {
    throw new Error("Exam year must be a valid four-digit year.");
  }
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const contentSha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const now = new Date().toISOString();
  const title = (input.title?.trim() || file.name).slice(0, 180);
  const mimeType = file.type || "application/octet-stream";
  return {
    id: crypto.randomUUID(),
    ownerId: owner,
    title,
    kind: input.kind,
    access: "user_upload" satisfies MarkingResourceAccess,
    reuse: input.reuse || "unknown",
    review: "retrieved",
    authority: "User-supplied document. Authenticity and reuse rights have not been independently verified.",
    sourceUrl: input.sourceUrl?.trim() || undefined,
    sourceDocument: file.name.slice(0, 255),
    retrievedAt: now,
    contentSha256,
    syllabusIdentity: requiredIdentity,
    attribution: input.attribution?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    fileName: file.name.slice(0, 255),
    mimeType,
    byteLength: file.size,
    fileBlob: file.slice(0, file.size, mimeType),
    extractionStatus: "pending",
    extractionWarnings: [
      "Original document preserved locally. Text extraction and page-level evidence have not yet run.",
      "Reuse rights default to unknown. This import cannot be used for marking or redistribution until reviewed.",
      "The uploader's syllabus selection is an assertion and must be checked against the document.",
    ],
  };
}
