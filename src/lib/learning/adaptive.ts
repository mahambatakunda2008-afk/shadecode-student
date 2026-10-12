/**
 * src/lib/learning/adaptive.ts
 *
 * Learns from one learner's own history which question types deserve more
 * practice. Laplace smoothing keeps a single early mistake from dominating, and
 * types the learner reliably gets right are shown less.
 */

export interface SignalRow {
  item_key: string | null;
  correct: boolean | null;
}

export function generatorWeights(rows: SignalRow[]): Record<string, number> {
  const stats = new Map<string, { attempts: number; wrong: number }>();
  for (const row of rows) {
    if (!row.item_key || row.correct === null) continue;
    const entry = stats.get(row.item_key) ?? { attempts: 0, wrong: 0 };
    entry.attempts += 1;
    if (!row.correct) entry.wrong += 1;
    stats.set(row.item_key, entry);
  }

  const weights: Record<string, number> = {};
  for (const [key, { attempts, wrong }] of stats) {
    const errorRate = (wrong + 1) / (attempts + 2); // smoothed, between 0 and 1
    weights[key] = attempts >= 5 && errorRate < 0.2 ? 0.4 : Number((1 + 2 * errorRate).toFixed(3));
  }
  return weights;
}
