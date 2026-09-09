/**
 * Deterministic curriculum change intelligence.
 *
 * This layer detects changes between two extracted objective sets. It never
 * promotes content to verified status. Human/source verification remains
 * the authority boundary.
 */

import type { CurriculumObjective } from "./objective-first";

export type ObjectiveChangeType =
  | "added"
  | "removed"
  | "modified"
  | "unchanged"
  | "possible_rename";

export interface ObjectiveChange {
  type: ObjectiveChangeType;
  previous?: CurriculumObjective;
  current?: CurriculumObjective;
  confidence: number;
  requiresVerification: boolean;
  reason: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 2));
}

function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

export function extractNumberedObjectives(
  text: string,
  curriculum: CurriculumObjective["curriculum"],
  provenance: CurriculumObjective["provenance"],
): Array<Pick<CurriculumObjective, "code" | "statement" | "status" | "curriculum" | "provenance">> {
  const results: Array<Pick<CurriculumObjective, "code" | "statement" | "status" | "curriculum" | "provenance">> = [];
  const lines = text.replace(/\r/g, "").split("\n");
  const objectivePattern = /^\s*(\d+(?:\.\d+)+)\s+(.+)$/;
  let current: { code: string; statement: string } | null = null;

  const flush = () => {
    if (!current) return;
    const statement = current.statement.replace(/\s+/g, " ").trim();
    if (statement) {
      results.push({
        code: current.code,
        statement,
        status: "draft",
        curriculum,
        provenance,
      });
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = objectivePattern.exec(line);
    if (match) {
      flush();
      current = { code: match[1], statement: match[2].trim() };
      continue;
    }

    // PDF extraction often wraps one objective across several lines. Continue
    // only while already inside an objective, so unrelated syllabus prose is
    // not promoted into objective records.
    if (current && !/^\d+(?:\.\d+)+\b/.test(line)) {
      current.statement += ` ${line}`;
    }
  }

  flush();
  return results;
}

export function diffObjectives(
  previous: CurriculumObjective[],
  current: CurriculumObjective[],
): ObjectiveChange[] {
  const previousByCode = new Map(previous.map((objective) => [objective.code, objective]));
  const currentByCode = new Map(current.map((objective) => [objective.code, objective]));
  const changes: ObjectiveChange[] = [];

  for (const objective of previous) {
    const replacement = currentByCode.get(objective.code);
    if (!replacement) {
      changes.push({
        type: "removed",
        previous: objective,
        confidence: 1,
        requiresVerification: true,
        reason: "Objective code existed previously but is absent from the new extraction.",
      });
      continue;
    }

    if (normalize(objective.statement) === normalize(replacement.statement)) {
      changes.push({
        type: "unchanged",
        previous: objective,
        current: replacement,
        confidence: 1,
        requiresVerification: false,
        reason: "Objective code and normalized statement are unchanged.",
      });
    } else {
      changes.push({
        type: "modified",
        previous: objective,
        current: replacement,
        confidence: 1,
        requiresVerification: true,
        reason: "Objective code is retained but its statement changed.",
      });
    }
  }

  for (const objective of current) {
    if (previousByCode.has(objective.code)) continue;
    changes.push({
      type: "added",
      current: objective,
      confidence: 1,
      requiresVerification: true,
      reason: "Objective code is present in the new extraction but not the previous one.",
    });
  }

  const removed = changes.filter((change) => change.type === "removed");
  const added = changes.filter((change) => change.type === "added");
  const renameThreshold = 0.65;
  const pairedAdded = new Set<ObjectiveChange>();

  for (const removal of removed) {
    let bestAddition: ObjectiveChange | undefined;
    let bestConfidence = 0;

    for (const addition of added) {
      if (pairedAdded.has(addition)) continue;
      const confidence = similarity(removal.previous?.statement ?? "", addition.current?.statement ?? "");
      if (confidence >= renameThreshold && confidence > bestConfidence) {
        bestAddition = addition;
        bestConfidence = confidence;
      }
    }

    if (!bestAddition) continue;
    pairedAdded.add(bestAddition);
    removal.type = "possible_rename";
    removal.confidence = bestConfidence;
    removal.reason = "A new objective has substantial lexical overlap with the removed objective; verify whether this is a rename/recode.";
    bestAddition.type = "possible_rename";
    bestAddition.confidence = bestConfidence;
    bestAddition.reason = "A removed objective has substantial lexical overlap with this new objective; verify whether this is a rename/recode.";
  }

  return changes;
}
