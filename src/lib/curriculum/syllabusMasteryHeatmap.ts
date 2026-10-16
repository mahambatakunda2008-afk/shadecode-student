export type MasteryBand = "insufficient_evidence" | "needs_work" | "developing" | "mastered";
export interface HeatmapObjective {
  objective_key: string;
  title: string;
  parent_key?: string | null;
  topic?: string | null;
  mastery_score?: number | null;
  attempts?: number | null;
  status?: string | null;
}
export interface HeatmapCell extends HeatmapObjective {
  mastery: number | null;
  evidenceAttempts: number;
  band: MasteryBand;
}
export interface HeatmapGroup {
  key: string;
  title: string;
  cells: HeatmapCell[];
  averageMastery: number | null;
  evidencedCount: number;
}
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const average = (scores: number[]) => scores.length ? Math.round(scores.reduce((s,n)=>s+n,0)/scores.length) : null;

/** Evidence-aware syllabus projection. A default zero score with zero attempts is not evidence of failure. */
export function projectSyllabusHeatmap(objectives: HeatmapObjective[], minimumAttempts = 1) {
  const cells: HeatmapCell[] = objectives.map((o) => {
    const evidenceAttempts = finite(o.attempts) ? Math.max(0, Math.floor(o.attempts)) : 0;
    const mastery = evidenceAttempts >= Math.max(1, minimumAttempts) && finite(o.mastery_score)
      ? Math.max(0, Math.min(100, o.mastery_score)) : null;
    const band: MasteryBand = mastery === null ? "insufficient_evidence"
      : mastery < 60 ? "needs_work" : mastery < 80 ? "developing" : "mastered";
    return {...o, mastery, evidenceAttempts, band};
  });
  const buckets = new Map<string, HeatmapCell[]>();
  for (const cell of cells) {
    const key = cell.parent_key ?? "__root__";
    buckets.set(key, [...(buckets.get(key) ?? []), cell]);
  }
  const groups: HeatmapGroup[] = [...buckets].map(([key, members]) => {
    const scores = members.flatMap(c => c.mastery === null ? [] : [c.mastery]);
    return {key, title: members[0]?.topic || members[0]?.title || (key === "__root__" ? "Syllabus overview" : key), cells: members, averageMastery: average(scores), evidencedCount: scores.length};
  });
  const scores = cells.flatMap(c => c.mastery === null ? [] : [c.mastery]);
  return {cells, groups, summary: {total: cells.length, evidenced: scores.length, averageMastery: average(scores)}};
}
