/**
 * src/lib/topicMastery/coverage.ts
 *
 * Pure roll-up of keyed topic_mastery rows into per-syllabus coverage:
 * how many verified subsections the learner has practised, their average
 * mastery, and the weakest subsections by official title.
 *
 * Only rows carrying a resolved curriculum key are counted, so every number
 * is backed by a verified syllabus subsection. Nothing is estimated for
 * subsections the learner has not attempted.
 */

import type { CurriculumTopicUnit } from "./resolver";

export interface KeyedMasteryRow {
  syllabus_id: string | null;
  curriculum_topic_key: string | null;
  mastery_score: number | string | null;
  last_attempted?: string | null;
}

export interface SubsectionMastery {
  topicKey: string;
  title: string;
  mastery: number;
  lastAttempted: string | null;
}

export interface SyllabusCoverage {
  syllabusId: string;
  subjectId: string;
  totalSubsections: number;
  practisedSubsections: number;
  averageMastery: number;
  weakest: SubsectionMastery[];
}

const WEAKEST_LIMIT = 3;

export function rollUpSyllabusCoverage(
  rows: KeyedMasteryRow[],
  units: CurriculumTopicUnit[],
): SyllabusCoverage[] {
  const unitByKey = new Map<string, CurriculumTopicUnit>();
  const totals = new Map<string, number>();
  for (const unit of units) {
    const key = `${unit.syllabusId}|${unit.topicKey}`;
    if (unitByKey.has(key)) continue;
    unitByKey.set(key, unit);
    totals.set(unit.syllabusId, (totals.get(unit.syllabusId) ?? 0) + 1);
  }

  // One entry per (syllabus, subsection): several free-text topics can resolve to the same key.
  const perSubsection = new Map<string, { scores: number[]; last: string | null; unit: CurriculumTopicUnit }>();
  for (const row of rows) {
    if (!row.syllabus_id || !row.curriculum_topic_key) continue;
    const unit = unitByKey.get(`${row.syllabus_id}|${row.curriculum_topic_key}`);
    const score = Number(row.mastery_score);
    if (!unit || !Number.isFinite(score)) continue;

    const key = `${unit.syllabusId}|${unit.topicKey}`;
    const entry = perSubsection.get(key) ?? { scores: [], last: null, unit };
    entry.scores.push(Math.max(0, Math.min(100, score)));
    if (row.last_attempted && (!entry.last || row.last_attempted > entry.last)) entry.last = row.last_attempted;
    perSubsection.set(key, entry);
  }

  const bySyllabus = new Map<string, SubsectionMastery[]>();
  const subjectBySyllabus = new Map<string, string>();
  for (const { scores, last, unit } of perSubsection.values()) {
    const mastery = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    const list = bySyllabus.get(unit.syllabusId) ?? [];
    list.push({ topicKey: unit.topicKey, title: unit.title, mastery, lastAttempted: last });
    bySyllabus.set(unit.syllabusId, list);
    subjectBySyllabus.set(unit.syllabusId, unit.subjectId);
  }

  return [...bySyllabus.entries()]
    .map(([syllabusId, subsections]) => ({
      syllabusId,
      subjectId: subjectBySyllabus.get(syllabusId) ?? "",
      totalSubsections: totals.get(syllabusId) ?? subsections.length,
      practisedSubsections: subsections.length,
      averageMastery: Math.round(subsections.reduce((sum, item) => sum + item.mastery, 0) / subsections.length),
      weakest: [...subsections].sort((a, b) => a.mastery - b.mastery || a.topicKey.localeCompare(b.topicKey, undefined, { numeric: true })).slice(0, WEAKEST_LIMIT),
    }))
    .sort((a, b) => b.practisedSubsections - a.practisedSubsections || a.syllabusId.localeCompare(b.syllabusId));
}
