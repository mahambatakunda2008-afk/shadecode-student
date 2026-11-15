import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "./fetchAllRows";
import { buildGrowthReport, type EventRow, type GrowthReport, type SignupRow } from "./growthReport";

/** 45 days covers MAU (30d) and the D30 window of the newest cohorts we show. */
export const EVENT_WINDOW_DAYS = 45;

export interface LoadedGrowthReport {
  report: GrowthReport;
  eventsTruncated: boolean;
  eventsFailed: boolean;
  signupSource: string;
}

/**
 * One loader for every admin page that shows student activity, so /admin/growth and
 * /admin/traction can never disagree. Callers must already have verified the admin
 * role; pass a client that can read all rows (service role).
 */
export async function loadGrowthReport(reader: SupabaseClient): Promise<LoadedGrowthReport> {
  const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 86_400_000).toISOString();
  const [events, profiles] = await Promise.all([
    fetchAllRows<EventRow>((from, to) =>
      reader.from("traction_events").select("name,user_id,anonymous_id,created_at,properties").gte("created_at", since).order("created_at", { ascending: false }).range(from, to)),
    fetchAllRows<SignupRow>((from, to) => reader.from("profiles").select("id,created_at").order("created_at", { ascending: false }).range(from, to)),
  ]);

  // If profiles has no usable signup dates, fall back to recorded signup events rather than showing nothing.
  let signups = profiles.rows.filter((p) => p.created_at);
  let signupSource = "profiles";
  if (profiles.failed || signups.length === 0) {
    signups = events.rows.filter((e) => e.name === "user_signed_up" && e.user_id).map((e) => ({ id: e.user_id as string, created_at: e.created_at }));
    signupSource = "user_signed_up events";
  }

  return { report: buildGrowthReport({ events: events.rows, signups }), eventsTruncated: events.truncated, eventsFailed: events.failed, signupSource };
}
