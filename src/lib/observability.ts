// ─────────────────────────────────────────────────────────────────────────────
// Structured observability for Shadecode Student analytics writes.
//
// All log entries are JSON-serialisable objects so they work cleanly in
// Vercel's log drain, Supabase log explorer, and Sentry APM integration.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level:     LogLevel;
  domain:    string;       // "ExamSim" | "RevisionQueue" | "FocusSession" | "Dashboard" | "Cortex" | "LessonGen" | "OfflineSync" | "API"
  event:     string;       // machine-readable event name
  message:   string;       // human-readable summary
  context?:  Record<string, unknown>;
  timestamp: string;       // ISO8601, set by logger not caller
}

function emit(entry: Omit<LogEntry, "timestamp">) {
  const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };

  // Write structured JSON log to stdout/stderr
  switch (entry.level) {
    case "error": {
      console.error("[SC]", JSON.stringify(full));
      
      // Capture error in Sentry
      const errorObject = entry.context?.error instanceof Error 
        ? entry.context.error 
        : new Error(entry.message);
        
      Sentry.captureException(errorObject, {
        tags: {
          domain: entry.domain,
          event: entry.event,
        },
        extra: entry.context,
      });
      break;
    }
    case "warn": {
      console.warn("[SC]", JSON.stringify(full));
      
      // Capture warning in Sentry
      Sentry.captureMessage(entry.message, {
        level: "warning",
        tags: {
          domain: entry.domain,
          event: entry.event,
        },
        extra: entry.context,
      });
      break;
    }
    default: {
      console.log("[SC]", JSON.stringify(full));
      
      // Add standard info log as Sentry breadcrumb
      Sentry.addBreadcrumb({
        category: entry.domain,
        message: entry.message,
        level: "info",
        data: entry.context,
      });
      break;
    }
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

  // Cortex failures
  cortexFailure: (context: {
    userId?: string;
    stage: string;
    error: string;
    payload?: unknown;
  }) => emit({
    level: "error",
    domain: "Cortex",
    event: "cortex_failure",
    message: `Cortex failure at stage "${context.stage}" — ${context.error}`,
    context,
  }),

  // Lesson generation failures
  lessonGenerationFailed: (context: {
    userId?: string;
    subject: string;
    topic: string;
    difficulty?: string;
    error: string;
  }) => emit({
    level: "error",
    domain: "LessonGen",
    event: "lesson_generation_failed",
    message: `Failed to generate lesson on ${context.subject} / "${context.topic}" — ${context.error}`,
    context,
  }),

  // Offline sync failures
  offlineSyncFailed: (context: {
    userId?: string;
    operation: string;
    table?: string;
    error: string;
  }) => emit({
    level: "error",
    domain: "OfflineSync",
    event: "offline_sync_failed",
    message: `Offline sync failed during "${context.operation}" — ${context.error}`,
    context,
  }),

  // API Failures
  apiFailure: (context: {
    route: string;
    method: string;
    status?: number;
    error: string;
    userId?: string;
  }) => emit({
    level: "error",
    domain: "API",
    event: "api_failure",
    message: `API failure at ${context.method} ${context.route} (Status: ${context.status ?? "unknown"}) — ${context.error}`,
    context,
  }),

  // Revision queue
  revisionInvalidInput: (context: {
    userId: string;
    subject: string;
    rawInput: unknown;
    reason: string;
  }) => emit({
    level: "warn",
    domain: "Revision",
    event: "revision_invalid_input",
    message: `Invalid revision input for user ${context.userId} — ${context.subject}: ${context.reason}`,
    context,
  }),
};

