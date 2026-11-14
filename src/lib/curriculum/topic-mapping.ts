import type { ResolvedCurriculumContext } from "./resolver";
import { normalizeLearningContextLabel } from "@/lib/intelligence/learningContextKey";

export type VerifiedTopicMapping =
  | { status: "matched"; curriculumTopicKey: string; title: string }
  | { status: "unmapped"; reason: "curriculum-unverified" | "topic-missing" | "no-exact-match" | "ambiguous-match" };

/**
 * Map a product's display topic to the exact verified topic record in the
 * learner's resolved syllabus. Deliberately exact: no fuzzy/AI matching can
 * silently assign evidence to the wrong syllabus objective.
 */
export function resolveVerifiedCurriculumTopic(
  curriculum: ResolvedCurriculumContext,
  topicLabel?: string,
): VerifiedTopicMapping {
  if (curriculum.status !== "resolved") return { status: "unmapped", reason: "curriculum-unverified" };
  const label = normalizeLearningContextLabel(topicLabel ?? "");
  if (!label) return { status: "unmapped", reason: "topic-missing" };

  const topics = curriculum.knowledgeByKind.topic ?? [];
  const matches = topics.filter((item) => {
    if (item.status !== "verified" || item.provenance?.mappingStatus !== "verified" || !item.code) return false;
    return [item.title, item.code, item.topicCode]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .some((value) => normalizeLearningContextLabel(value) === label);
  });

  if (matches.length === 0) return { status: "unmapped", reason: "no-exact-match" };
  if (matches.length !== 1) return { status: "unmapped", reason: "ambiguous-match" };
  return { status: "matched", curriculumTopicKey: matches[0].code!, title: matches[0].title };
}
