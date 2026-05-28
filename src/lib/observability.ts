// ─────────────────────────────────────────────────────────────────────────────
// Structured observability for Shadecode Student analytics writes.
//
// All log entries are JSON-serialisable objects so they work cleanly in
// Vercel's log drain, Supabase log explorer, and any future APM integration.
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level:     LogLevel;
  domain:    string;       // which subsystem: "ExamSim" | "RevisionQueue" | "FocusSession" | "Dashboard"
  event:     string;       // machine-readable event name
  message:   string;       // human-readable summary
  context?:  Record<string, unknown>;
  timestamp: string;       // ISO8601, set by logger not caller
}

function emit(entry: Omit<LogEntry, "timestamp">) {
  const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };

  switch (entry.level) {
    case "error": console.error("[SC]", JSON.stringify(full)); break;
    case "warn":  console.warn ("[SC]", JSON.stringify(full)); break;
    default:      console.log  ("[SC]", JSON.stringify(full)); break;
  }
}

// ── Pre-built event constructors ──────────────────────────────────────────────

export const log = {
  // Exam submission
  examInsertFailed: (context: {
    userId: string;
    subject: string;
    code?: string;
    message?: string;
  }) => emit({
    level:   "error",
    domain:  "ExamSim",
    event:   "exam_insert_failed",
    message: `Failed to save exam result for user ${context.userId} — ${context.subject}`,
    context,
  }),

  examDuplicateBlocked: (context: {
    userId: string;
    subject: string;
  }) => emit({
    level:   "warn",
    domain:  "ExamSim",
    event:   "exam_duplicate_blocked",
    message: `Duplicate exam submission blocked for user ${context.userId}`,
    context,
  }),

  examMarkingFailed: (context: {
    userId: string;
    subject: string;
    status?: number;
    error?: string;
  }) => emit({
    level:   "error",
    domain:  "ExamSim",
    event:   "exam_marking_failed",
    message: `AI marking API call failed for user ${context.userId} — ${context.subject}`,
    context,
  }),

  // Revision queue
  revisionUpsertFailed: (context: {
    userId: string;
    topic:  string;
    subject: string;
    code?:  string;
    message?: string;
  }) => emit({
    level:   "error",
    domain:  "RevisionQueue",
    event:   "revision_upsert_failed",
    message: `Failed to upsert revision item "${context.topic}" for user ${context.userId}`,
    context,
  }),

  revisionInvalidInput: (context: {
    userId:   string;
    subject:  string;
    rawInput: unknown;
    reason:   string;
  }) => emit({
    level:   "warn",
    domain:  "RevisionQueue",
    event:   "revision_invalid_input",
    message: `Invalid weakAreas input for user ${context.userId} — ${context.reason}`,
    context: {
      ...context,
      rawInput: typeof context.rawInput === "object"
        ? JSON.stringify(context.rawInput).slice(0, 200)
        : String(context.rawInput).slice(0, 200),
    },
  }),

  // Focus sessions
  focusSessionSaveFailed: (context: {
    userId:         string;
    durationMinutes: number;
    code?:          string;
    message?:       string;
  }) => emit({
    level:   "error",
    domain:  "FocusSession",
    event:   "focus_session_save_failed",
    message: `Failed to save focus session for user ${context.userId}`,
    context,
  }),

  // Dashboard
  dashboardLoadFailed: (context: {
    userId?: string;
    stage:   string;
    error:   string;
  }) => emit({
    level:   "error",
    domain:  "Dashboard",
    event:   "dashboard_load_failed",
    message: `Dashboard load failed at stage "${context.stage}"`,
    context,
  }),

  streakUpdateFailed: (context: {
    userId:  string;
    error:   string;
  }) => emit({
    level:   "warn",
    domain:  "Dashboard",
    event:   "streak_update_failed",
    message: `Streak update failed for user ${context.userId} — dashboard still loads`,
    context,
  }),
};
