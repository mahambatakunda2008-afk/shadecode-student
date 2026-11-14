import type { CortexStudentContext } from "@/lib/cortex/student-context";

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Convert the authenticated, syllabus-scoped Cortex context into compact
 * remediation guidance. Only evidence for the active subject is included.
 */
export function buildSharedVerifyLearnerContext(
  context: CortexStudentContext,
  subject: string,
  maxChars = 3000,
): string {
  const subjectKey = normalize(subject);
  const topics = context.topics.items
    .filter(item => normalize(item.subjectKey) === subjectKey && item.attempts > 0 && item.masteryScore !== null)
    .slice(0, 10);
  const repeatedErrors = context.mistakes.repeatedTopicErrors
    .filter(item => normalize(item.subjectKey) === subjectKey)
    .slice(0, 6);
  const recurringMistakes = context.mistakes.recurringMistakes
    .filter(item => normalize(item.subjectKey) === subjectKey)
    .slice(0, 6);
  const suggestions = context.reviewSuggestions.items
    .filter(item => normalize(item.subjectKey) === subjectKey)
    .slice(0, 6);
  // Objective evidence currently has no subject key. Exclude it here rather than
  // risk placing another subject's objectives in this subject-specific prompt.

  const lines = [
    "AUTHENTICATED SHARED CORTEX LEARNER EVIDENCE (active verified curriculum; heuristic, not ground truth):",
    ...topics.map(item =>
      `- ${item.topicId}: ${item.learnerState.mastery}; ${item.masteryScore}% measured mastery across ${item.attempts} attempt(s); trajectory ${item.learnerState.trajectory}; evidence ${item.learnerState.evidenceStrength}; error rate ${item.errorRate === null ? "unknown" : item.errorRate + "%"}.`,
    ),
    ...repeatedErrors.map(item =>
      `- Repeated errors in ${item.topicId}: ${item.incorrectResponses} incorrect responses across ${item.distinctAttempts} distinct attempts.`,
    ),
    ...recurringMistakes.map(item =>
      `- Recurring diagnosed mistake in ${item.topicId}: ${item.mistakeId}, across ${item.distinctAttempts} distinct attempts.`,
    ),
    ...suggestions.map(item =>
      `- Evidence-backed review suggestion: ${item.topicId}; ${item.priority} priority; ${item.reason}; ${item.distinctAttempts} distinct attempts. This is a suggestion, not a predicted due date.`,
    ),
    "Use this evidence only to tailor the explanation and next practice task. Mark the submitted work independently. Do not infer mastery from lesson views or one attempt. Prefer a fresh transfer question for developing topics, guided reteaching for repeated errors, and retrieval practice where evidence supports it.",
  ];

  const useful = lines.filter((line, index) => index === 0 || index === lines.length - 1 || !line.startsWith("- ") || line.length > 2);
  const rendered = useful.join("\n");
  return rendered.length > maxChars ? rendered.slice(0, Math.max(0, maxChars - 1)) + "…" : rendered;
}
