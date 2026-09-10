import {
  ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  ZIMSEC_O_LEVEL_CS_4021_ALL_COMPETENCY_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_TOPICS,
} from "./zimsec-o-level-computer-science-4021-2024-2030";
import {
  createAuthoritativeContentPack,
  objectiveToLearningContent,
} from "../content-scope";
import type { LearningContentItem } from "../../code-lab/learning-scope";

/**
 * Current ZIMSEC 4021 content inventory exposed through the universal scope.
 *
 * IMPORTANT: this pack is intentionally incomplete/unverified until the
 * authoritative syllabus has been retrieved and reconciled in full. Nothing
 * here may be presented as complete exam-required coverage yet.
 */
const topicItems: LearningContentItem[] = ZIMSEC_O_LEVEL_CS_4021_TOPICS.map((topic) => ({
  id: `zimsec-4021-topic-${topic}`,
  kind: "topic",
  title: topic,
  content: topic.replaceAll("-", " "),
  status: "draft",
  identity: {
    kind: "curriculum",
    authorityId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
    boardId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
    qualificationId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.qualificationId,
    level: ZIMSEC_O_LEVEL_CS_4021_2024_2030.level,
    syllabusId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusId,
    syllabusVersion: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusVersion,
    subjectId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.subjectId,
  },
  provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
}));

export const ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK = createAuthoritativeContentPack({
  id: "zimsec-o-level-computer-science-4021-2024-2030",
  identity: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  source: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  content: [
    ...ZIMSEC_O_LEVEL_CS_4021_ALL_COMPETENCY_OBJECTIVES.map(objectiveToLearningContent),
    ...topicItems,
  ],
  complete: false,
  verified: false,
});
