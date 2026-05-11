// /lib/cortex/scoring.ts

import { StudentState } from "./engine";

export function computeLeaderboardScore(u: StudentState) {
  return (
    u.weekly_xp +
    u.level * 50 +
    u.streak * 20
  );
}
