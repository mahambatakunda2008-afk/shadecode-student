/**
 * Shared presentation contract for lesson generation.
 * Keeps revision material scannable and makes Geography case studies evidence-led.
 */
export function buildPresentationGuidance(subject: string, topic: string): string {
  const isGeography = /geograph/i.test(subject);
  const asksForCaseStudies = /case[ -]?stud(?:y|ies)|named example|case examples|case-study/i.test(topic);

  const base = [
    "PRESENTATION CONTRACT",
    "- Prefer concise, scannable notes with descriptive headings.",
    "- Define key terms before using them; separate definitions from explanations.",
    "- Include concrete examples, worked reasoning where relevant, and exam application.",
    "- Do not force the content into a story or fictional narrative.",
    "- Use retrieval questions that make the learner recall or apply information.",
  ];

  if (isGeography && asksForCaseStudies) {
    base.push(
      "",
      "GEOGRAPHY CASE-STUDY CONTRACT",
      "- Structure each case as: location and context; process/issue; causes; impacts; management/response; outcomes; evidence; exam application.",
      "- Keep each section short enough to revise quickly, but specific enough to support a written answer.",
      "- Distinguish verified facts from general explanation. Never invent statistics, dates, named places, outcomes, or sources.",
      "- If reliable evidence for a detail is unavailable in the supplied curriculum context, label it 'VERIFY BEFORE MEMORISING' instead of guessing.",
      "- Finish with flashcard-style retrieval prompts and one exam-style application question.",
      "- If the learner supplies a list of 24 cases, preserve their names and track each separately; do not replace the list with invented cases."
    );
  }

  return base.join("\n");
}
