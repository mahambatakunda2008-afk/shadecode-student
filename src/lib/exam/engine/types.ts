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

export interface QuestionGenerator {
  id: string;
  subject: EngineSubject;
  /** Human topic label shown on results and used for mastery. */
  topic: string;
  /** Lower-case words a student or plan might use for this topic. */
  keywords: string[];
  build(rng: Rng): BuiltItem;
}
