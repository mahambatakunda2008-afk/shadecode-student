import { contentId, isValidContentId } from "../distributed/resource";

/**
 * Portable, client-neutral resource envelope.
 *
 * Payload bytes are kept separate from the manifest so adapters can persist
 * them in IndexedDB, native files, or a portable archive without changing the
 * metadata contract. The manifest is JSON-serializable.
 */
export const RESOURCE_PACKAGE_FORMAT = "shadecode-resource" as const;
export const RESOURCE_PACKAGE_VERSION = 1 as const;
export const MAX_RESOURCE_PACKAGE_BYTES = 64 * 1024 * 1024;

export type ResourceReviewStatus =
  | "official"
  | "teacher-approved"
  | "supplementary"
  | "unreviewed";

export type ResourceOrigin =
  | "local-import"
  | "teacher-pack"
  | "online-discovery"
  | "bundled";

export interface ResourceCurriculumMapping {
  board?: string;
  qualification?: string;
  subject: string;
  subjectCode?: string;
  syllabusVersion?: string;
  topic?: string;
  objectiveIds?: string[];
}

export interface ResourceProvenance {
  origin: ResourceOrigin;
  originalUrl?: string;
  originalFileName?: string;
  authorOrPublisher?: string;
  publicationDate?: string;
  retrievedAt?: string;
  importedAt: string;
  checksumAlgorithm: "SHA-256";
}

export interface ResourceReview {
  status: ResourceReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  evidence?: string;
}

export interface ResourcePackageManifestV1 {
  format: typeof RESOURCE_PACKAGE_FORMAT;
  version: typeof RESOURCE_PACKAGE_VERSION;
  resourceId: string;
  title: string;
  mimeType: string;
  fileName: string;
  byteLength: number;
  payloadSha256: string;
  createdAt: string;
  curriculum: ResourceCurriculumMapping;
  provenance: ResourceProvenance;
  review: ResourceReview;
}

export interface ResourcePackageV1 {
  manifest: ResourcePackageManifestV1;
  /** Exact original document/media bytes, not extracted text or a remote URL. */
  payload: Uint8Array;
}

export type ResourcePackageValidationCode =
  | "unsupported-format"
  | "unsupported-version"
  | "invalid-manifest"
  | "invalid-payload"
  | "payload-too-large"
  | "size-mismatch"
  | "invalid-checksum"
  | "checksum-mismatch"
  | "invalid-review-evidence";

export class ResourcePackageError extends Error {
  constructor(
    readonly code: ResourcePackageValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "ResourcePackageError";
  }
}

const SHA256_HEX = /^[a-f0-9]{64}$/i;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return nonEmpty(value) && !Number.isNaN(Date.parse(value));
}

export function validateResourcePackageManifest(
  value: unknown,
): asserts value is ResourcePackageManifestV1 {
  if (!value || typeof value !== "object") {
    throw new ResourcePackageError("invalid-manifest", "Resource manifest must be an object.");
  }

  const manifest = value as Partial<ResourcePackageManifestV1>;
  if (manifest.format !== RESOURCE_PACKAGE_FORMAT) {
    throw new ResourcePackageError("unsupported-format", "Unsupported resource package format.");
  }
  if (manifest.version !== RESOURCE_PACKAGE_VERSION) {
    throw new ResourcePackageError("unsupported-version", "Unsupported resource package version.");
  }
  if (
    !nonEmpty(manifest.resourceId) ||
    !nonEmpty(manifest.title) ||
    !nonEmpty(manifest.mimeType) ||
    !nonEmpty(manifest.fileName) ||
    !isIsoDate(manifest.createdAt) ||
    !manifest.curriculum ||
    typeof manifest.curriculum !== "object" ||
    !nonEmpty(manifest.curriculum.subject) ||
    !manifest.provenance ||
    typeof manifest.provenance !== "object" ||
    !manifest.review ||
    typeof manifest.review !== "object"
  ) {
    throw new ResourcePackageError("invalid-manifest", "Resource manifest is missing required metadata.");
  }

  if (
    !Number.isSafeInteger(manifest.byteLength) ||
    (manifest.byteLength as number) < 0 ||
    (manifest.byteLength as number) > MAX_RESOURCE_PACKAGE_BYTES
  ) {
    throw new ResourcePackageError("payload-too-large", "Resource payload size is outside the supported limit.");
  }
  if (!SHA256_HEX.test(manifest.payloadSha256 ?? "")) {
    throw new ResourcePackageError("invalid-checksum", "Resource manifest must contain a SHA-256 checksum.");
  }
  if (
    !isIsoDate(manifest.provenance.importedAt) ||
    manifest.provenance.checksumAlgorithm !== "SHA-256"
  ) {
    throw new ResourcePackageError("invalid-manifest", "Resource provenance is incomplete.");
  }
  if (
    !["local-import", "teacher-pack", "online-discovery", "bundled"].includes(manifest.provenance.origin)
  ) {
    throw new ResourcePackageError("invalid-manifest", "Resource origin is not supported.");
  }
  if (
    !["official", "teacher-approved", "supplementary", "unreviewed"].includes(manifest.review.status)
  ) {
    throw new ResourcePackageError("invalid-manifest", "Resource review status is not supported.");
  }
  if (
    (manifest.review.status === "official" || manifest.review.status === "teacher-approved") &&
    (!nonEmpty(manifest.review.reviewer) ||
      !isIsoDate(manifest.review.reviewedAt) ||
      !nonEmpty(manifest.review.evidence))
  ) {
    throw new ResourcePackageError(
      "invalid-review-evidence",
      "Official and teacher-approved resources require an identified reviewer, review date, and evidence.",
    );
  }
  if (
    manifest.provenance.originalUrl !== undefined &&
    !/^https:\/\//i.test(manifest.provenance.originalUrl)
  ) {
    throw new ResourcePackageError("invalid-manifest", "Original source URLs must use HTTPS.");
  }
}

/** Build a manifest from exact payload bytes; caller supplies provenance and review state. */
export async function createResourcePackage(
  input: Omit<ResourcePackageManifestV1, "format" | "version" | "resourceId" | "byteLength" | "payloadSha256">,
  payload: Uint8Array,
): Promise<ResourcePackageV1> {
  if (!(payload instanceof Uint8Array)) {
    throw new ResourcePackageError("invalid-payload", "Resource payload must be a Uint8Array.");
  }
  if (payload.byteLength > MAX_RESOURCE_PACKAGE_BYTES) {
    throw new ResourcePackageError("payload-too-large", "Resource payload exceeds the 64 MB package limit.");
  }

  const bytes = new Uint8Array(payload.byteLength);
  bytes.set(payload);
  const digest = await contentId(bytes);
  const manifest: ResourcePackageManifestV1 = {
    ...input,
    format: RESOURCE_PACKAGE_FORMAT,
    version: RESOURCE_PACKAGE_VERSION,
    resourceId: digest,
    byteLength: bytes.byteLength,
    payloadSha256: digest,
  };
  validateResourcePackageManifest(manifest);
  return { manifest, payload: bytes };
}

/** Validate metadata, byte count and cryptographic integrity before a package is committed. */
export async function validateResourcePackage(
  value: unknown,
): Promise<ResourcePackageV1> {
  if (!value || typeof value !== "object") {
    throw new ResourcePackageError("invalid-payload", "Resource package must be an object.");
  }
  const candidate = value as Partial<ResourcePackageV1>;
  validateResourcePackageManifest(candidate.manifest);
  if (!(candidate.payload instanceof Uint8Array)) {
    throw new ResourcePackageError("invalid-payload", "Resource package payload is missing.");
  }
  if (candidate.payload.byteLength !== candidate.manifest.byteLength) {
    throw new ResourcePackageError("size-mismatch", "Resource payload size does not match its manifest.");
  }
  if (!isValidContentId(candidate.manifest.resourceId)) {
    throw new ResourcePackageError("invalid-checksum", "Resource identifier is not a SHA-256 digest.");
  }
  const actualDigest = await contentId(candidate.payload);
  if (
    actualDigest !== candidate.manifest.payloadSha256.toLowerCase() ||
    actualDigest !== candidate.manifest.resourceId.toLowerCase()
  ) {
    throw new ResourcePackageError("checksum-mismatch", "Resource payload failed its SHA-256 integrity check.");
  }
  return {
    manifest: candidate.manifest,
    payload: new Uint8Array(candidate.payload),
  };
}
