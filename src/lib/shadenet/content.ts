export type ShadeNetResourceType = "lesson" | "video" | "question-set" | "flashcards" | "study-pack" | "other";

export interface ShadeNetResourceMetadata {
  type: ShadeNetResourceType;
  title: string;
  subject?: string;
  qualification?: string;
  syllabus?: string;
  version?: string;
  source?: string;
  authorOrPublisher?: string;
  verificationStatus?: "official" | "teacher-verified" | "community" | "ai-generated" | "unverified";
  createdAt: string;
}

export interface ShadeNetResource<T = unknown> {
  contentHash: string;
  metadata: ShadeNetResourceMetadata;
  content: T;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(",")}}`;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Produces the stable identity for a resource's canonical payload and metadata. */
export async function contentHash<T>(resource: Omit<ShadeNetResource<T>, "contentHash">): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("Web Crypto is required for ShadeNet content addressing");
  const canonical = canonicalize({ metadata: resource.metadata, content: resource.content });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return bytesToHex(digest);
}

export async function createResource<T>(resource: Omit<ShadeNetResource<T>, "contentHash">): Promise<ShadeNetResource<T>> {
  return { ...resource, contentHash: await contentHash(resource) };
}
