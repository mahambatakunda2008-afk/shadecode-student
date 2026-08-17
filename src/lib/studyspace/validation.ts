import type { WorkObject } from "./types";

const MODES = new Set(["workmate", "practice", "assessment", "exam", "canvas"]);
const STATUSES = new Set(["draft", "submitted", "marked", "synced"]);

export function isWorkObject(value: unknown): value is WorkObject {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WorkObject>;
  return typeof item.id === "string" &&
    MODES.has(String(item.mode)) &&
    (!item.status || STATUSES.has(String(item.status))) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string";
}
