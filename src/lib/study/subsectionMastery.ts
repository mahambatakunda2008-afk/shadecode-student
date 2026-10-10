/**
 * src/lib/study/subsectionMastery.ts
 *
 * Groups verified subsections by syllabus and overlays the learner's keyed
 * mastery. Subsections the learner has not practised report `mastery: null`
 * (never a made-up number).
 */

export interface UnitRow {
  syllabus_id: string;
  subject_id: string;
  topic_key: string;
  title: string;
  level?: string | null;
}

export interface MasteryRow {
  syllabus_id: string | null;
  curriculum_topic_key: string | null;
  mastery_score: number | string | null;
}

export interface SubsectionSummary {
  topicKey: string;
  title: string;
  level: string | null;
  mastery: number | null;
}

export interface SyllabusSummary {
  syllabusId: string;
  subjectId: string;
  practised: number;
  topics: SubsectionSummary[];
}

const compareKeys = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export function rollUpSubsectionMastery(units: UnitRow[], mastery: MasteryRow[]): SyllabusSummary[] {
  const scores = new Map<string, number[]>();
  for (const row of mastery) {
    const value = Number(row.mastery_score);
    if (!row.syllabus_id || !row.curriculum_topic_key || !Number.isFinite(value)) continue;
    const key = `${row.syllabus_id}|${row.curriculum_topic_key}`;
    scores.set(key, [...(scores.get(key) ?? []), Math.max(0, Math.min(100, value))]);
  }

  const bySyllabus = new Map<string, SyllabusSummary>();
  for (const unit of units) {
    const summary = bySyllabus.get(unit.syllabus_id) ?? { syllabusId: unit.syllabus_id, subjectId: unit.subject_id, practised: 0, topics: [] };
    const values = scores.get(`${unit.syllabus_id}|${unit.topic_key}`);
    const average = values?.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    if (average !== null) summary.practised += 1;
    summary.topics.push({ topicKey: unit.topic_key, title: unit.title, level: unit.level ?? null, mastery: average });
    bySyllabus.set(unit.syllabus_id, summary);
  }

  return [...bySyllabus.values()]
    .map((summary) => ({ ...summary, topics: summary.topics.sort((a, b) => compareKeys(a.topicKey, b.topicKey)) }))
    .sort((a, b) => a.syllabusId.localeCompare(b.syllabusId));
}
