export interface TopicCandidate {
  id: string;
  name: string;
  keywords?: string[];
}

export interface TopicProposal {
  topicId: string;
  confidence: number;
  evidence: string;
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

/**
 * Evidence-first topic suggestion. It is deliberately lexical and explainable:
 * it may propose a mapping, but it must never write the mapping or claim that
 * a curriculum relationship is authoritative.
 */
export function suggestQuestionTopic(
  questionText: string,
  candidates: TopicCandidate[],
  minimumConfidence = 0.55,
): TopicProposal | null {
  const questionTokens = tokenize(questionText);
  if (questionTokens.size === 0) return null;

  let best: { candidate: TopicCandidate; score: number; matched: string[] } | null = null;

  for (const candidate of candidates) {
    const terms = new Set([...tokenize(candidate.name), ...(candidate.keywords ?? []).flatMap((value) => [...tokenize(value)])]);
    const matched = [...terms].filter((term) => questionTokens.has(term));
    if (matched.length === 0) continue;

    const coverage = matched.length / Math.max(terms.size, 1);
    const questionCoverage = matched.length / questionTokens.size;
    const score = Math.min(1, coverage * 0.7 + questionCoverage * 0.3);

    if (!best || score > best.score) best = { candidate, score, matched };
  }

  if (!best || best.score < minimumConfidence) return null;

  return {
    topicId: best.candidate.id,
    confidence: Number(best.score.toFixed(3)),
    evidence: `Lexical overlap: ${best.matched.join(", ")}`,
  };
}
