import type { ProjectSnapshot } from "./recovery";

export function formatSnapshotTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function snapshotReasonLabel(reason: ProjectSnapshot["reason"]): string {
  switch (reason) {
    case "before-delete": return "Before deletion";
    case "before-restore": return "Before restore";
    case "manual": return "Manual save";
    default: return "Autosave";
  }
}
