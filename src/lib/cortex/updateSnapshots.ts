import type { CortexSnapshot } from "@/lib/types";

export function updateSnapshotFromExam(params: {
  snapshot: CortexSnapshot;
  subject: string;
  score: number;
  weakTopics?: string[];
}): CortexSnapshot {
  const { snapshot, subject, score, weakTopics = [] } = params;

  const updated: CortexSnapshot = {
    ...snapshot,
    lastExamScore: score,
    lastExamSubject: subject,
  };

  // track weak subjects
  const weak = new Set(updated.weakestSubjects ?? []);
  const strong = new Set(updated.strongestSubjects ?? []);

  if (score < 50) {
    weak.add(subject);
    strong.delete(subject);
  } else if (score >= 75) {
    strong.add(subject);
    weak.delete(subject);
  }

  updated.weakestSubjects = Array.from(weak);
  updated.strongestSubjects = Array.from(strong);

  return updated;
}
