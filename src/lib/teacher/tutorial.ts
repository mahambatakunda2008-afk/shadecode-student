/**
 * Teacher tutorials: block model, validation and review ids. Pure, shared by server and client.
 * A tutorial is an ordered list of blocks, the same shape lessons already use, with two extra media types.
 */
import { contentHash } from "@/lib/exam/curated/registry";

export const TUTORIAL_STATUSES = ["draft", "in_review", "verified"] as const;
export type TutorialStatus = (typeof TUTORIAL_STATUSES)[number];

export type TutorialBlock =
  | { type: "text"; title?: string; content: string }
  | { type: "image"; url: string; alt: string }
  | { type: "video"; provider: VideoProvider; embedUrl: string; sourceUrl: string; title: string };

export type VideoProvider = "youtube" | "drive";

export const MAX_BLOCKS = 60;
export const MAX_TEXT = 5000;
export const MAX_ALT = 300;

export interface TutorialRow {
  id: string;
  title: string;
  blocks: unknown;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com", "youtube-nocookie.com"]);
const YOUTUBE_ID = /^[\w-]{11}$/;
const DRIVE_ID = /^[\w-]{10,100}$/;

/** Accepts only YouTube and Google Drive links and rebuilds a safe embed URL from the extracted id. */
export function parseVideoUrl(input: string): { provider: VideoProvider; embedUrl: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    else if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|live)\/([^/?]+)/.exec(url.pathname);
      id = m ? m[1] : null;
    }
    if (id && YOUTUBE_ID.test(id)) return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    return null;
  }

  if (url.hostname === "drive.google.com") {
    const m = /^\/file\/d\/([^/]+)/.exec(url.pathname);
    if (m && DRIVE_ID.test(m[1])) return { provider: "drive", embedUrl: `https://drive.google.com/file/d/${m[1]}/preview` };
  }
  return null;
}

export type SanitizeResult = { ok: true; blocks: TutorialBlock[] } | { ok: false; error: string };

/**
 * Validates untrusted blocks from the client. Images must live in our own teacher-media bucket (no hotlinking or
 * tracking pixels) and video embed URLs are always rebuilt from the source link, never trusted as sent.
 */
export function sanitizeBlocks(input: unknown, imagePrefix: string): SanitizeResult {
  if (!Array.isArray(input)) return { ok: false, error: "Blocks must be a list." };
  if (input.length > MAX_BLOCKS) return { ok: false, error: `A tutorial can have at most ${MAX_BLOCKS} blocks.` };

  const blocks: TutorialBlock[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid block." };
    const b = raw as Record<string, unknown>;

    if (b.type === "text") {
      const content = typeof b.content === "string" ? b.content.trim() : "";
      const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
      if (!content && !title) continue;
      if (content.length > MAX_TEXT) return { ok: false, error: `Text blocks are limited to ${MAX_TEXT} characters.` };
      blocks.push(title ? { type: "text", title, content } : { type: "text", content });
    } else if (b.type === "image") {
      const url = typeof b.url === "string" ? b.url : "";
      if (!url.startsWith(imagePrefix) || url.length > 400) return { ok: false, error: "Images must be uploaded through the editor." };
      blocks.push({ type: "image", url, alt: typeof b.alt === "string" ? b.alt.trim().slice(0, MAX_ALT) : "" });
    } else if (b.type === "video") {
      const source = typeof b.sourceUrl === "string" ? b.sourceUrl : "";
      const parsed = parseVideoUrl(source);
      if (!parsed) return { ok: false, error: "Use a YouTube or Google Drive video link." };
      blocks.push({
        type: "video",
        provider: parsed.provider,
        embedUrl: parsed.embedUrl,
        sourceUrl: source.trim().slice(0, 300),
        title: typeof b.title === "string" ? b.title.trim().slice(0, 160) : "",
      });
    } else {
      return { ok: false, error: "Unknown block type." };
    }
  }
  return { ok: true, blocks };
}

export function tutorialReviewId(row: TutorialRow): string {
  return `tutorial-${row.id}-${contentHash(`${row.title}\u241f${JSON.stringify(row.blocks ?? null)}`)}`;
}

export function parseTutorialReviewId(id: string): string | null {
  const match = /^tutorial-([0-9a-f-]{36})-[0-9a-z]+$/.exec(id);
  return match ? match[1] : null;
}
