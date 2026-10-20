/**
 * Shared presentation contract for every Shadecode lesson.
 * Subject-specific instructions add precision without narrowing the product to one learner.
 */
export function buildPresentationGuidance(subject: string, topic: string): string {
  const normalizedSubject = subject.trim().toLowerCase();
  const normalizedTopic = topic.trim().toLowerCase();
  const isGeography = /geograph/.test(normalizedSubject);
  const asksForCaseStudies = /case[ -]?stud(?:y|ies)|named example|case examples|case-study/.test(normalizedTopic);
  const isMaths = /mathematics|maths|math/.test(normalizedSubject);
  const isPhysics = /physics/.test(normalizedSubject);
  const isComputerScience = /computer science|computing|informatics/.test(normalizedSubject);
  const isChemistry = /chemistry/.test(normalizedSubject);
  const isBiology = /biology/.test(normalizedSubject);

  const guidance = [
    "UNIVERSAL LEARNING QUALITY CONTRACT",
    "- Teach the actual requested topic and the learner's stated level, syllabus, exam board, and goal; do not assume every learner is preparing for the same exam.",
    "- Organize content for fast understanding and later revision: descriptive headings, concise notes, key-term definitions, and a clear progression from foundations to application.",
    "- Explain why a method or claim works, not only what to memorize. Include worked examples when useful and show intermediate reasoning rather than skipping crucial steps.",
    "- Distinguish facts, rules, assumptions, interpretations, and uncertainty. Never fabricate sources, curriculum requirements, statistics, quotations, experiments, or mark-scheme claims.",
    "- Use diagrams, tables, equations, pseudocode, or structured comparisons when they communicate better than paragraphs. Keep notation consistent and define symbols.",
    "- Include appropriate practice with answers or marking guidance, common misconceptions, retrieval prompts, and a next step matched to the learner's performance.",
    "- Avoid filler, repetitive conclusions, forced stories, generic motivational paragraphs, and oversized introductions. A narrative is appropriate only when it genuinely teaches the topic.",
    "- Do not claim syllabus alignment or factual verification unless the available context supports that claim. Flag missing specifics as 'VERIFY WITH YOUR SYLLABUS / SOURCE'.",
  ];

  if (isMaths) guidance.push(
    "",
    "MATHEMATICS ADD-ON",
    "- State relevant definitions, conditions, formulae, and restrictions before applying them.",
    "- Show a logically ordered solution with intermediate steps, explain the method choice, and check the result where possible.",
    "- Include at least one representative worked problem and graduated practice; identify common algebraic or notation errors."
  );
  if (isPhysics) guidance.push(
    "",
    "PHYSICS ADD-ON",
    "- Define quantities and symbols, state SI units, and explain the physical meaning of equations.",
    "- Show derivations step by step when relevant; distinguish scalar and vector quantities and state assumptions.",
    "- For calculations, show substitution, units, significant figures when relevant, and a reasonableness check. For practical work, cover variables, method, measurements, safety, and uncertainty where relevant."
  );
  if (isComputerScience) guidance.push(
    "",
    "COMPUTER SCIENCE ADD-ON",
    "- Use precise terminology and language-neutral explanations unless a programming language or syllabus is specified.",
    "- When relevant, include pseudocode, trace tables, worked algorithms, data structures, test data, expected outputs, and boundary/error cases.",
    "- Explain why an algorithm works and discuss suitable efficiency, validation, and debugging considerations at the learner's level."
  );
  if (isChemistry) guidance.push(
    "",
    "CHEMISTRY ADD-ON",
    "- Balance equations and preserve chemical formulae, charges, state symbols, and conditions where relevant.",
    "- Explain observations and reaction mechanisms using correct particles and chemical reasoning; distinguish observations from explanations.",
    "- Include calculations with units and steps, and practical details such as variables, measurements, safety, and sources of error where relevant."
  );
  if (isBiology) guidance.push(
    "",
    "BIOLOGY ADD-ON",
    "- Use accurate biological terminology and explain processes in a causal sequence.",
    "- Distinguish structure from function, correlation from causation, and observations from explanations.",
    "- Include labelled diagram guidance or process comparisons when useful, and connect answers to the command words and level specified by the learner."
  );

  if (isGeography && asksForCaseStudies) guidance.push(
    "",
    "GEOGRAPHY CASE-STUDY ADD-ON",
    "- Structure each case as: location and context; process/issue; causes; impacts; management/response; outcomes; evidence; exam application.",
    "- Keep each section concise enough to revise quickly, but specific enough to support a written answer.",
    "- Distinguish verified facts from general explanation. Never invent statistics, dates, named places, outcomes, or sources.",
    "- If reliable evidence for a detail is unavailable in the supplied context, label it 'VERIFY BEFORE MEMORISING' instead of guessing.",
    "- Finish with flashcard-style retrieval prompts and one exam-style application question.",
    "- If the learner supplies a list of 24 cases, preserve their names and track each separately; do not replace the list with invented cases."
  );

  return guidance.join("\n");
}
