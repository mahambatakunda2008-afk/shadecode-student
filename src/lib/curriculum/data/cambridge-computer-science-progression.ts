import type { LearningScope } from "../../code-lab/learning-scope";
import type { CambridgeLearningRequirement } from "./cambridge-computer-science-requirements";

/**
 * Candidate progression graph for Cambridge Computer Science.
 *
 * Edges are deliberately conservative: they describe useful learning order,
 * not a claim that Cambridge mandates one classroom sequence. Curriculum
 * alignment remains fail-closed until the underlying requirement mappings are
 * reconciled against the exact syllabus version.
 */
export interface CambridgeProgressionEdge {
  id: string;
  syllabusId: "cambridge-0478" | "cambridge-0984" | "cambridge-2210" | "cambridge-9618";
  from: string;
  to: string;
  reason: "prerequisite" | "builds-on" | "supports-practical";
  status: "draft" | "verified";
}

const edges0478: CambridgeProgressionEdge[] = [
  { id: "0478-p1", syllabusId: "cambridge-0478", from: "0478-1.1-r1", to: "0478-1.1-r2", reason: "builds-on", status: "draft" },
  { id: "0478-p2", syllabusId: "cambridge-0478", from: "0478-1.1-r2", to: "0478-1.3-r1", reason: "builds-on", status: "draft" },
  { id: "0478-p3", syllabusId: "cambridge-0478", from: "0478-7.1-r1", to: "0478-7.2-r1", reason: "builds-on", status: "draft" },
  { id: "0478-p4", syllabusId: "cambridge-0478", from: "0478-7.2-r1", to: "0478-8.1-r1", reason: "prerequisite", status: "draft" },
  { id: "0478-p5", syllabusId: "cambridge-0478", from: "0478-8.1-r1", to: "0478-8.2-r1", reason: "builds-on", status: "draft" },
  { id: "0478-p6", syllabusId: "cambridge-0478", from: "0478-8.1-r1", to: "0478-8.3-r1", reason: "builds-on", status: "draft" },
  { id: "0478-p7", syllabusId: "cambridge-0478", from: "0478-7.3-r1", to: "0478-8.1-r1", reason: "supports-practical", status: "draft" },
  { id: "0478-p8", syllabusId: "cambridge-0478", from: "0478-8.1-r1", to: "0478-9-r1", reason: "builds-on", status: "draft" },
  { id: "0478-p9", syllabusId: "cambridge-0478", from: "0478-8.1-r1", to: "0478-10-r1", reason: "builds-on", status: "draft" },
];

export const CAMBRIDGE_0478_PROGRESSION = edges0478;
export const CAMBRIDGE_0984_PROGRESSION = edges0478.map((edge) => ({ ...edge, id: edge.id.replace("0478", "0984"), syllabusId: "cambridge-0984" as const, from: edge.from.replace("0478", "0984"), to: edge.to.replace("0478", "0984") }));
export const CAMBRIDGE_2210_PROGRESSION = edges0478.map((edge) => ({ ...edge, id: edge.id.replace("0478", "2210"), syllabusId: "cambridge-2210" as const, from: edge.from.replace("0478", "2210"), to: edge.to.replace("0478", "2210") }));

export function isCambridgeRequirementInScope(requirement: CambridgeLearningRequirement, scope: LearningScope): boolean {
  return requirement.status === "verified" && scope.verified && scope.complete && scope.identity.syllabusId === requirement.syllabusId && scope.identity.syllabusVersion === requirement.version;
}

export function progressionForScope(scope: LearningScope): CambridgeProgressionEdge[] {
  if (!scope.complete || !scope.verified) return [];
  if (scope.identity.syllabusId === "cambridge-0478") return CAMBRIDGE_0478_PROGRESSION.filter((e) => e.status === "verified");
  if (scope.identity.syllabusId === "cambridge-0984") return CAMBRIDGE_0984_PROGRESSION.filter((e) => e.status === "verified");
  if (scope.identity.syllabusId === "cambridge-2210") return CAMBRIDGE_2210_PROGRESSION.filter((e) => e.status === "verified");
  return [];
}
