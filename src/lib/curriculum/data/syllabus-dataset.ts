/**
 * Shared shape and row builder for officially sourced syllabus datasets
 * (section -> numbered topic -> numbered learning outcome).
 *
 * Outcomes are concise statements in our own words that keep the syllabus's terminology and its
 * explicit scope exclusions ("X is not required"). Never add content that is not in the official document.
 */
export interface SyllabusDataset {
  meta: {
    authority: string;
    boardId: string;
    qualificationId: string;
    syllabusId: string;
    syllabusVersion: string;
    subjectId: string;
    sourceUrl: string;
    sourceDocument: string;
    edition: string;
    validFor: string;
    retrievedAt: string;
    effectiveFrom: string;
    effectiveTo: string;
  };
  sections: Array<{
    key: string;
    title: string;
    paper: string;
    availability: string;
    level: string;
    summary: string;
    topics: Array<{ key: string; title: string; page: number; outcomes: string[] }>;
  }>;
}

export interface SyllabusRow {
  objective_key: string;
  parent_key: string | null;
  topic: string | null;
  title: string;
  description: string;
  education_level: string;
}

export function compareObjectiveKeys(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? -1) - (y[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Section rows ("1".."n") plus one row per numbered learning outcome ("1.1.1", "1.1.2", ...). */
export function buildSyllabusRows(dataset: SyllabusDataset): SyllabusRow[] {
  const rows: SyllabusRow[] = [];
  for (const section of dataset.sections) {
    rows.push({ objective_key: section.key, parent_key: null, topic: null, title: section.title, description: section.summary, education_level: section.level });
    for (const topic of section.topics) {
      topic.outcomes.forEach((outcome, index) => {
        rows.push({ objective_key: `${topic.key}.${index + 1}`, parent_key: section.key, topic: topic.key, title: topic.title, description: outcome, education_level: section.level });
      });
    }
  }
  return rows.sort((a, b) => compareObjectiveKeys(a.objective_key, b.objective_key));
}

/** Canonical line per row; the md5 of the joined lines is checked against the database. */
export function canonicalRowLine(row: SyllabusRow): string {
  return [row.objective_key, row.parent_key ?? "", row.topic ?? "", row.title, row.description, row.education_level].join("|");
}
