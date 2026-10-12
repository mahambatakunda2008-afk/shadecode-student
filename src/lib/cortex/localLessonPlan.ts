export function buildLocalSectionRequirements(index: number, sectionCount: number): string {
  const count = Math.max(1, Math.floor(sectionCount));
  const position = Math.max(0, Math.min(count - 1, Math.floor(index)));
  if (position === 0 && count === 1) {
    return "Include a clear learner target, foundational concepts, at least one worked example, a thinking checkpoint, exam transfer, one likely misconception, synthesis, and a summary.";
  }
  if (position === 0) {
    return "Include a clear learner target, prerequisites, vocabulary, and foundational concepts. Add a thinking checkpoint if it fits naturally.";
  }
  if (position === count - 1) {
    return "This is the FINAL section. Include at least one worked example and thinking checkpoint, plus exam transfer, a common misconception or mistake, synthesis, and a concise summary. Do not refer to a nonexistent later section.";
  }
  if (position === count - 2) {
    return "Include at least one worked example and thinking checkpoint. Connect the ideas to exam-style reasoning and surface a likely misconception or mistake.";
  }
  return "Include at least one worked example and one thinking checkpoint. Extend the concepts with a concrete application or comparison.";
}
