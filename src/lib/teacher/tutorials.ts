import "server-only";

export type TutorialBlockType = "text" | "image" | "diagram" | "sketch" | "video" | "audio" | "graph" | "table";

export interface TutorialBlock {
  id: string;
  type: TutorialBlockType;
  content?: string;
  title?: string;
  caption?: string;
  alt?: string;
  storagePath?: string;
  provider?: "youtube" | "drive";
  providerId?: string;
  transcript?: string;
  data?: Record<string, unknown>;
}

const BLOCK_TYPES = new Set<TutorialBlockType>(["text", "image", "diagram", "sketch", "video", "audio", "graph", "table"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseYouTubeId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname !== "youtube.com" && url.hostname !== "www.youtube.com" && url.hostname !== "m.youtube.com") return null;
    const id = url.pathname === "/watch" ? url.searchParams.get("v") ?? "" : url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] ?? "";
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function parseDriveId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || (url.hostname !== "drive.google.com" && url.hostname !== "docs.google.com")) return null;
    const id = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      ?? url.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      ?? url.searchParams.get("id")
      ?? "";
    return /^[a-zA-Z0-9_-]{10,200}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function validateTutorialBlocks(value: unknown, authorId: string): { ok: true; blocks: TutorialBlock[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return { ok: false, error: "Add between 1 and 100 content blocks." };
  const blocks: TutorialBlock[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "A content block is malformed." };
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || !UUID.test(item.id) || typeof item.type !== "string" || !BLOCK_TYPES.has(item.type as TutorialBlockType)) {
      return { ok: false, error: "A content block has an invalid ID or unsupported type." };
    }
    const block: TutorialBlock = { id: item.id, type: item.type as TutorialBlockType };
    for (const key of ["content", "title", "caption", "alt", "transcript"] as const) {
      const v = item[key];
      if (v !== undefined) {
        if (typeof v !== "string" || v.length > (key === "content" || key === "transcript" ? 20000 : 1000)) {
          return { ok: false, error: `The ${key} field is invalid or too long.` };
        }
        block[key] = v;
      }
    }
    if (block.type === "text" && !block.content?.trim()) return { ok: false, error: "Text blocks cannot be empty." };

    if (["image", "diagram", "sketch", "audio"].includes(block.type)) {
      if (typeof item.storagePath !== "string" || !item.storagePath.startsWith(`${authorId}/`) || item.storagePath.includes("..")) {
        return { ok: false, error: "Media must reference a file uploaded to your private teacher folder." };
      }
      block.storagePath = item.storagePath;
      if (!block.alt && ["image", "diagram", "sketch"].includes(block.type)) return { ok: false, error: "Images and diagrams need descriptive alt text." };
    }

    if (block.type === "video") {
      if (item.provider === "youtube") {
        const id = typeof item.providerId === "string" ? item.providerId : "";
        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return { ok: false, error: "The YouTube video ID is invalid." };
        block.provider = "youtube";
        block.providerId = id;
      } else if (item.provider === "drive") {
        const id = typeof item.providerId === "string" ? item.providerId : "";
        if (!/^[a-zA-Z0-9_-]{10,200}$/.test(id)) return { ok: false, error: "The Google Drive file ID is invalid." };
        block.provider = "drive";
        block.providerId = id;
      } else return { ok: false, error: "Only YouTube and Google Drive video links are supported." };
    }

    if (block.type === "graph" || block.type === "table") {
      if (!item.data || typeof item.data !== "object" || Array.isArray(item.data)) return { ok: false, error: `${block.type} blocks need structured data.` };
      block.data = item.data as Record<string, unknown>;
      if (JSON.stringify(block.data).length > 20000) return { ok: false, error: "Structured visual data is too large." };
    }
    blocks.push(block);
  }
  return { ok: true, blocks };
}
