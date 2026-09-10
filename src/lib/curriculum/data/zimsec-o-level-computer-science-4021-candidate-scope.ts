import {
  createAuthoritativeContentPack,
  objectiveToLearningContent,
} from "../content-scope";
import {
  ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  ZIMSEC_O_LEVEL_CS_4021_ALL_COMPETENCY_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
} from "./zimsec-o-level-computer-science-4021-2024-2030";
import { ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_CONTENT_INVENTORY } from "./zimsec-o-level-computer-science-4021-content-inventory";
import { ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT } from "./zimsec-o-level-computer-science-4021-candidate-assessment";

/**
 * Candidate expanded scope. This is deliberately separate from the
 * production content pack so unverified secondary-source content cannot be
 * accidentally presented as authoritative exam coverage.
 */
export const ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_SCOPE = createAuthoritativeContentPack({
  id: "zimsec-o-level-computer-science-4021-2024-2030-candidate",
  identity: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  source: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  content: [
    ...ZIMSEC_O_LEVEL_CS_4021_ALL_COMPETENCY_OBJECTIVES.map(objectiveToLearningContent),
    ...ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_CONTENT_INVENTORY,
    ...ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT,
  ],
  complete: false,
  verified: false,
});
