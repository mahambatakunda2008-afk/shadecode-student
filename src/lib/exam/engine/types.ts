import type { NumericSpec } from "./numeric";
import type { Rng } from "./rng";

export type EngineSubject = "Mathematics" | "Physics" | "Chemistry" | "Computer Science";

export interface BuiltItem {
  /** Question text. `$...$` renders as KaTeX in the exam UI. */
  question: string;
  numeric: NumericSpec;
  /** Worked solution shown after marking. */
  working: string[];
  marks: number;
  /** Raw parameters, so tests can recompute the answer independently. */
  params: Record<string, number | string>;
}

export type EngineLevel = "olevel" | "alevel";

export interface QuestionGenerator {
  id: string;
  subject: EngineSubject;
  /** Human topic label shown on results and used for mastery. */
  topic: string;
  /** Lower-case words a student or plan might use for this topic. */
  keywords: string[];
  /**
   * Restricts the generator to one stage. Unset means it suits both. O-Level (Forms 1-4) never receives
   * `alevel` content in a broad paper; an explicitly requested topic is still honoured.
   */
  level?: EngineLevel;
  build(rng: Rng): BuiltItem;
}
