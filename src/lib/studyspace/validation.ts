import type { WorkObject } from "./types";

export function isWorkObject(value: unknown): value is WorkObject {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WorkObject>;
  return typeof item.id === "string" &&
    typeof item.mode === "string" &&
    ["workmate", "practice", "assessment", "exam", "canvas"].includes(item.mode) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string";
}
