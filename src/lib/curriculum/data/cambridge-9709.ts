import syllabus from "./cambridge-9709-2026-2027.json";

/**
 * Cambridge International AS & A Level Mathematics 9709 (syllabus for 2026 and 2027, version 4,
 * December 2025), structured from the official PDF:
 * https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf
 *
 * Outcomes are concise statements in our own words that keep the syllabus's terminology and its
 * explicit scope exclusions ("X is not required"), so teaching never expands beyond the syllabus.
 * Never add content that is not in the official document.
 */
export interface Cambridge9709Row {
  objective_key: string;
  parent_key: string | null;
  topic: string | null;
  title: string;
  description: string;
  education_level: string;
}

export const CAMBRIDGE_9709_IDENTITY = syllabus.meta;

function naturalKey(key: string): number[] {
  return key.split(".").map(Number);
}

export function compareObjectiveKeys(a: string, b: string): number {
  const x = naturalKey(a);
  const y = naturalKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? -1) - (y[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Section rows ("1".."6") plus one row per numbered learning outcome ("1.1.1", "1.1.2", ...). */
export function buildCambridge9709Rows(): Cambridge9709Row[] {
  const rows: Cambridge9709Row[] = [];
  for (const section of syllabus.sections) {
    rows.push({
      objective_key: section.key,
      parent_key: null,
      topic: null,
      title: section.title,
      description: section.summary,
      education_level: section.level,
    });
    for (const topic of section.topics) {
      topic.outcomes.forEach((outcome, index) => {
        rows.push({
          objective_key: `${topic.key}.${index + 1}`,
          parent_key: section.key,
          topic: topic.key,
          title: topic.title,
          description: outcome,
          education_level: section.level,
        });
      });
    }
  }
  return rows.sort((a, b) => compareObjectiveKeys(a.objective_key, b.objective_key));
}

/** Canonical line per row; the md5 of the joined lines is checked against the database. */
export function canonicalRowLine(row: Cambridge9709Row): string {
  return [row.objective_key, row.parent_key ?? "", row.topic ?? "", row.title, row.description, row.education_level].join("|");
}
