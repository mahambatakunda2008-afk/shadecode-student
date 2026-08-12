import type { LearningCandidate } from "@/lib/learning-engine/shadecodeLearningUtility";
import type { CalibrationExample } from "./calibrationEngine";

export const CORTEX_BENCHMARK_VERSION = "v1.0.0" as const;

export interface CortexBenchmarkCase extends CalibrationExample {
  id: string;
  category:
    | "exam_pressure"
    | "weak_topic"
    | "forgetting"
    | "rapid_improvement"
    | "prerequisite_failure"
    | "sparse_history"
    | "conflicting_goals"
    | "time_constraint"
    | "exploration"
    | "misleading_confidence"
    | "multi_subject";
  rationale: string;
}

const candidate = (
  id: string,
  overrides: Partial<LearningCandidate> = {},
): LearningCandidate => ({
  id,
  type: "revision",
  mastery: 50,
  retentionRisk: 50,
  examUrgency: 30,
  prerequisiteValue: 50,
  goalAlignment: 50,
  curriculumGap: 50,
  trendRisk: 30,
  uncertainty: 50,
  momentum: 50,
  estimatedMinutes: 15,
  ...overrides,
});

export const CORTEX_BENCHMARK_V1: CortexBenchmarkCase[] = [
  {
    id: "exam-pressure-weak-topic",
    category: "exam_pressure",
    candidates: [candidate("weak-topic", { mastery: 25, retentionRisk: 80, examUrgency: 95 }), candidate("comfortable-topic", { mastery: 80, examUrgency: 90 })],
    preferredCandidateId: "weak-topic",
    rationale: "Near-term exam pressure should favor a materially weak topic over a comfortable topic.",
  },
  {
    id: "weak-topic-no-exam",
    category: "weak_topic",
    candidates: [candidate("weak-topic", { mastery: 20, curriculumGap: 85 }), candidate("strong-topic", { mastery: 90, curriculumGap: 10 })],
    preferredCandidateId: "weak-topic",
    rationale: "A substantial mastery gap should create useful intervention pressure even without an imminent exam.",
  },
  {
    id: "forgetting-risk",
    category: "forgetting",
    candidates: [candidate("fading-topic", { mastery: 70, retentionRisk: 90 }), candidate("stable-topic", { mastery: 65, retentionRisk: 15 })],
    preferredCandidateId: "fading-topic",
    rationale: "High retention risk should make a previously learned topic worth revisiting.",
  },
  {
    id: "rapid-improvement",
    category: "rapid_improvement",
    candidates: [candidate("improving-topic", { mastery: 45, trendRisk: 5, momentum: 95 }), candidate("stalled-topic", { mastery: 50, trendRisk: 75, momentum: 25 })],
    preferredCandidateId: "stalled-topic",
    rationale: "A rapidly improving topic should not automatically dominate a more concerning stalled topic.",
  },
  {
    id: "prerequisite-bottleneck",
    category: "prerequisite_failure",
    candidates: [candidate("prerequisite", { mastery: 35, prerequisiteValue: 100 }), candidate("downstream", { mastery: 30, prerequisiteValue: 25 })],
    preferredCandidateId: "prerequisite",
    rationale: "Repairing a prerequisite bottleneck can unlock downstream learning.",
  },
  {
    id: "sparse-history",
    category: "sparse_history",
    candidates: [candidate("unknown-topic", { mastery: 50, uncertainty: 95 }), candidate("known-topic", { mastery: 45, uncertainty: 20 })],
    preferredCandidateId: "unknown-topic",
    rationale: "High uncertainty should create room for evidence gathering rather than false certainty.",
  },
  {
    id: "conflicting-goals",
    category: "conflicting_goals",
    candidates: [candidate("exam-topic", { examUrgency: 90, goalAlignment: 30 }), candidate("goal-topic", { examUrgency: 30, goalAlignment: 95 })],
    preferredCandidateId: "exam-topic",
    rationale: "The benchmark expects urgent external constraints to beat a non-urgent goal preference in this case.",
  },
  {
    id: "short-session",
    category: "time_constraint",
    candidates: [candidate("short-task", { estimatedMinutes: 5, mastery: 35 }), candidate("long-task", { estimatedMinutes: 45, mastery: 20 })],
    preferredCandidateId: "short-task",
    rationale: "Under a short available session, a useful intervention that fits should beat an impractical one.",
  },
  {
    id: "exploration",
    category: "exploration",
    candidates: [candidate("new-topic", { uncertainty: 100, mastery: 50 }), candidate("known-topic", { uncertainty: 10, mastery: 50 })],
    preferredCandidateId: "new-topic",
    rationale: "When outcomes are otherwise tied, some exploration should gather evidence about uncertain topics.",
  },
  {
    id: "misleading-confidence",
    category: "misleading_confidence",
    candidates: [candidate("confident-weak", { mastery: 25, goalAlignment: 80 }), candidate("uncertain-strong", { mastery: 75, uncertainty: 70 })],
    preferredCandidateId: "confident-weak",
    rationale: "Self-confidence should not hide a large observed mastery gap.",
  },
  {
    id: "multi-subject-pressure",
    category: "multi_subject",
    candidates: [candidate("math", { mastery: 35, examUrgency: 80 }), candidate("physics", { mastery: 30, examUrgency: 75 }), candidate("cs", { mastery: 80, examUrgency: 90 })],
    preferredCandidateId: "math",
    rationale: "The benchmark expects the system to balance several competing subjects rather than simply choosing the highest exam urgency.",
  },
];
