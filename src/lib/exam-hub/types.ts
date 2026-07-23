/**
 * /lib/exam-hub/types.ts
 *
 * Types for the Exam Hub past-papers system. Mirrors the schema in
 * supabase/migrations/0024_create_past_papers_system.sql — keep in sync.
 */

export type PaperKind = "qp" | "ms" | "in" | "gt";
// Session naming differs by board (CAIE: three sittings a year; ZIMSEC: two),
// so this is a plain string rather than a fixed union — validated per-board
// where it matters (admin upload), not globally.
export type PaperSession = string;
export type PaperStatus = "not_started" | "in_progress" | "completed";

export interface Syllabus {
  id: string; // e.g. "9702" or "zimsec-mathematics-o"
  subject: string;
  board: string; // "CAIE" | "ZIMSEC"
  levels: string[];
}

export interface PastPaper {
  id: string;
  syllabus_id: string;
  level: string;
  session: PaperSession;
  year: number;
  paper_number: number;
  variant: number;
  kind: PaperKind;
  file_path: string;
  file_size_bytes: number | null;
  page_count: number | null;
  source_url: string | null;
  created_at: string;
}

export interface UserPastPaperState {
  user_id: string;
  paper_id: string;
  bookmarked: boolean;
  status: PaperStatus;
  last_page: number;
  score: number | null;
  time_spent_seconds: number;
  downloaded_offline: boolean;
  updated_at: string;
}

export interface UserSavedQuestion {
  id: string;
  user_id: string;
  paper_id: string;
  page_number: number;
  note: string | null;
  topic_id: string | null;
  created_at: string;
}

/** A paper joined with the requesting user's own state, if any. */
export interface PastPaperWithState extends PastPaper {
  state: UserPastPaperState | null;
}

export const PAPER_KIND_LABELS: Record<PaperKind, string> = {
  qp: "Question Paper",
  ms: "Mark Scheme",
  in: "Insert",
  gt: "Grade Thresholds",
};

export const SESSIONS_BY_BOARD: Record<string, PaperSession[]> = {
  CAIE: ["Feb/March", "May/June", "Oct/Nov"],
  ZIMSEC: ["June", "November"],
};

/** @deprecated Use SESSIONS_BY_BOARD[board] instead — kept only for CAIE-specific call sites. */
export const PAPER_SESSIONS: PaperSession[] = SESSIONS_BY_BOARD.CAIE;
