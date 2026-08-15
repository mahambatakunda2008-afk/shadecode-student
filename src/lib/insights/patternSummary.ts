/**
 * src/lib/insights/patternSummary.ts
 *
 * Pure logic for the Insight History page's "most frequent pattern"
 * summary (`.cortex/tasks.md` Phase 1 -- the one gap self-documented in
 * DEVLOG.md's own placeholder note).
 *
 * Deliberately a plain word-frequency count across stored `cortex_insights`
 * rows, not an AI call or a claimed semantic pattern -- consistent with
 * this codebase's existing rule against fabricated-sounding precision
 * (see `retentionRisk.ts`'s own comment on the same principle). It answers
 * a narrow, honest question: which meaningful word recurs across the most
 * distinct insights this history has stored.
 */

export interface InsightLike {
  insight: string;
}

export interface PatternSummary {
  /** The most frequently recurring word, in its original casing on first sight. */
  theme: string;
  /** Number of distinct insights containing that word (at most once per insight). */
  count: number;
  /** Total insights considered. */
  totalInsights: number;
}

// Common English words plus deterministic-template connective words
// ("currently", "recent", "across") that recur in every insight regardless
// of actual content -- excluded so the surfaced theme is substantive.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "within", "this", "that", "have",
  "has", "was", "were", "not", "you", "your", "now", "spans", "over",
  "currently", "recent", "recently", "remain", "remains", "levels",
  "level", "active", "across", "activity", "increased", "decreased",
  "narrowed", "expanded", "consecutive", "current", "focus", "continue",
  "several", "more", "will", "from", "into", "onto", "than", "all",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

/**
 * Finds the most frequently recurring meaningful word across a set of
 * insights. Returns null when there isn't enough data to honestly call
 * something a "pattern" (fewer than 3 insights, or no word recurs in more
 * than one) -- an empty summary block is preferable to an overconfident
 * one built on a single data point.
 */
export function summarizeMostFrequentPattern(
  insights: InsightLike[]
): PatternSummary | null {
  if (insights.length < 3) return null;

  const counts = new Map<string, number>();
  const firstSeenCasing = new Map<string, string>();

  for (const { insight } of insights) {
    const wordsInThisInsight = new Set(tokenize(insight));
    for (const word of wordsInThisInsight) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
      if (!firstSeenCasing.has(word)) firstSeenCasing.set(word, word);
    }
  }

  let bestWord: string | null = null;
  let bestCount = 0;

  for (const [word, count] of counts) {
    if (count > bestCount) {
      bestWord = word;
      bestCount = count;
    }
  }

  if (!bestWord || bestCount < 2) return null;

  return {
    theme: firstSeenCasing.get(bestWord) ?? bestWord,
    count: bestCount,
    totalInsights: insights.length,
  };
}
