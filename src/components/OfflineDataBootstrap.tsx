"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { localFirstStore } from "@/lib/local-first";

const SNAPSHOTS = [
  ["tasks", "task"],
  ["timetable", "timetable"],
  ["achievements", "achievement"],
  ["insights", "insight"],
  ["cortex_insights", "insight"],
  ["subjects", "study_state"],
  ["study_topics", "study_state"],
  ["profiles", "study_state"],
] as const;

export default function OfflineDataBootstrap() {
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || cancelled || !navigator.onLine) return;

      await Promise.all(
        SNAPSHOTS.map(async ([table, entity]) => {
          // Keep device snapshots bounded. The local-first layer is for the
          // active study surface, not an unbounded database mirror.
          const { data, error } = await supabase.from(table).select("*").limit(100);
          if (error || cancelled) return;

          await localFirstStore.upsert({
            id: `snapshot:${table}:${userId}`,
            entity,
            userId,
            payload: {
              table,
              fetchedAt: Date.now(),
              rows: data ?? [],
            },
          });
        }),
      );
    })().catch(() => {
      // Offline bootstrap is best-effort. The app must remain usable when a
      // single table or network request is unavailable.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
