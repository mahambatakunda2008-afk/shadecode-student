// /lib/cortex/scoring.ts

import { StudentState } from "./engine";

export function computeLeaderboardScore(u: StudentState) {
  return Math.round(
    u.weekly_xp +
    u.level * 25 +
    u.streak * 10
  );
}