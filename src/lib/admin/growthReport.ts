/**
 * src/lib/admin/growthReport.ts
 *
 * Pure aggregation behind /admin/growth. Everything here is computed from real
 * rows (traction_events + signup dates) with unique-student counts, never from
 * ratios of raw event counts. Days are UTC days.
 */

export interface EventRow {
  name: string;
  user_id: string | null;
  /** Browser id; present for signed-out visitors too. */
  anonymous_id?: string | null;
  created_at: string;
  properties?: Record<string, unknown> | null;
}
export interface SignupRow {
  id: string;
  created_at: string;
}

/** Events that mean the student actually did learning, not just opened the app. */
export const LEARNING_START_EVENTS = ["learning_action_started", "learning_session_started", "exam_started", "quiz_started"] as const;
export const LEARNING_DONE_EVENTS = ["learning_session_completed", "exam_completed", "task_completed", "quiz_completed", "lesson_completed"] as const;
export const SHARE_EVENTS = ["result_shared", "share_completed", "share_started"] as const;
const ENGAGED = new Set<string>([...LEARNING_START_EVENTS, ...LEARNING_DONE_EVENTS]);

const DAY_MS = 86_400_000;
export const dayKey = (iso: string | number | Date): string => new Date(iso).toISOString().slice(0, 10);
const dayIndex = (key: string): number => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

export interface FunnelStep { key: string; label: string; users: number; ofSignups: number | null; ofPrevious: number | null }
export interface CohortRow { weekStart: string; size: number; d1: number | null; d7: number | null; d30: number | null }
export interface DayPoint { day: string; active: number; engaged: number; signups: number }
export interface CountRow { label: string; events: number; users: number }
/** Visitors are distinct browsers (anonymous_id), not signed-in students. */
export interface AcquisitionRow { label: string; visitors: number; bots: number; mobilePct: number | null }

export interface GrowthReport {
  generatedAt: string;
  headline: {
    signups7d: number; signupsPrev7d: number; signupsGrowthPct: number | null;
    /** Calendar-day (UTC) actives; reads low early in a new UTC day. */
    dau: number;
    /** Students active in the rolling last 24 hours: meaningful at any time of day. */
    active24h: number;
    wau: number; mau: number; engagedWau: number; stickinessPct: number | null;
    /** Distinct browsers seen in the last 7 days, signed in or not. */
    visitors7d: number;
    /** New students in the last 7 days as a share of visitors in the same window. */
    visitorToSignupPct: number | null;
    exports7d: number;
  };
  /** Overall rolling retention across the last six weeks of signups. */
  retention: { d1: number | null; d7: number | null; d30: number | null; students: number };
  series: DayPoint[];
  funnel: FunnelStep[];
  cohorts: CohortRow[];
  adoption: {
    actionSources: CountRow[];
    goalKinds: CountRow[];
    firstStep: { syllabus: number; generic: number };
    shares: CountRow[];
  };
  /** Where the last 7 days of visitors came from. Only sessions that recorded a channel (tracking began with that deploy) appear. */
  acquisition: { channels: AcquisitionRow[]; landingTaps: CountRow[]; trackedVisitors: number };
  topEvents: CountRow[];
  health: { eventsAnalysed: number; anonymousPct: number | null; signupsKnown: number };
}

interface Options { events: readonly EventRow[]; signups: readonly SignupRow[]; now?: Date; funnelWindowDays?: number; seriesDays?: number }

const uniq = <T,>(set: Set<T> | undefined) => set?.size ?? 0;

function countBy(rows: readonly EventRow[], pick: (e: EventRow) => string | null): CountRow[] {
  const map = new Map<string, { events: number; users: Set<string> }>();
  for (const e of rows) {
    const label = pick(e);
    if (!label) continue;
    const entry = map.get(label) ?? { events: 0, users: new Set<string>() };
    entry.events += 1;
    if (e.user_id) entry.users.add(e.user_id);
    map.set(label, entry);
  }
  return [...map.entries()].map(([label, v]) => ({ label, events: v.events, users: v.users.size })).sort((a, b) => b.events - a.events);
}

const prop = (e: EventRow, key: string): string | null => {
  const v = e.properties?.[key];
  return typeof v === "string" && v ? v : null;
};

export function buildGrowthReport({ events, signups, now = new Date(), funnelWindowDays = 14, seriesDays = 14 }: Options): GrowthReport {
  const today = dayIndex(dayKey(now));
  const known = events.filter((e) => Number.isFinite(Date.parse(e.created_at)));

  // Per-user activity days (any event, and learning events only).
  const activeDays = new Map<string, Set<number>>();
  const dayActive = new Map<number, Set<string>>();
  const dayEngaged = new Map<number, Set<string>>();
  for (const e of known) {
    if (!e.user_id) continue;
    const d = dayIndex(dayKey(e.created_at));
    (activeDays.get(e.user_id) ?? activeDays.set(e.user_id, new Set()).get(e.user_id)!).add(d);
    (dayActive.get(d) ?? dayActive.set(d, new Set()).get(d)!).add(e.user_id);
    if (ENGAGED.has(e.name)) (dayEngaged.get(d) ?? dayEngaged.set(d, new Set()).get(d)!).add(e.user_id);
  }
  const usersBetween = (map: Map<number, Set<string>>, from: number, to: number) => {
    const out = new Set<string>();
    for (let d = from; d <= to; d++) map.get(d)?.forEach((u) => out.add(u));
    return out.size;
  };

  // Signups per day.
  const signupDay = new Map<number, number>();
  const signupOf = new Map<string, { created: number; day: number }>();
  for (const s of signups) {
    const t = Date.parse(s.created_at);
    if (!Number.isFinite(t) || !s.id) continue;
    const d = dayIndex(dayKey(t));
    signupDay.set(d, (signupDay.get(d) ?? 0) + 1);
    signupOf.set(s.id, { created: t, day: d });
  }
  const signupsBetween = (from: number, to: number) => { let n = 0; for (let d = from; d <= to; d++) n += signupDay.get(d) ?? 0; return n; };
  const signups7d = signupsBetween(today - 6, today);
  const signupsPrev7d = signupsBetween(today - 13, today - 7);

  const since24h = now.getTime() - DAY_MS;
  const active24 = new Set<string>();
  for (const e of known) if (e.user_id && Date.parse(e.created_at) >= since24h) active24.add(e.user_id);
  const wau = usersBetween(dayActive, today - 6, today);
  const mau = usersBetween(dayActive, today - 29, today);
  let dauSum = 0;
  for (let d = today - 6; d <= today; d++) dauSum += uniq(dayActive.get(d));

  const series: DayPoint[] = [];
  for (let d = today - (seriesDays - 1); d <= today; d++) {
    series.push({ day: new Date(d * DAY_MS).toISOString().slice(0, 10), active: uniq(dayActive.get(d)), engaged: uniq(dayEngaged.get(d)), signups: signupDay.get(d) ?? 0 });
  }

  // Activation funnel over recent signups, using only each student's events AFTER they signed up.
  const cohort = [...signupOf.entries()].filter(([, s]) => s.day >= today - (funnelWindowDays - 1));
  const cohortIds = new Set(cohort.map(([id]) => id));
  const stepUsers = { opened: new Set<string>(), started: new Set<string>(), done: new Set<string>(), shared: new Set<string>(), returned: new Set<string>() };
  for (const e of known) {
    if (!e.user_id || !cohortIds.has(e.user_id)) continue;
    const s = signupOf.get(e.user_id)!;
    if (Date.parse(e.created_at) < s.created) continue;
    stepUsers.opened.add(e.user_id);
    if ((LEARNING_START_EVENTS as readonly string[]).includes(e.name)) stepUsers.started.add(e.user_id);
    if ((LEARNING_DONE_EVENTS as readonly string[]).includes(e.name)) stepUsers.done.add(e.user_id);
    if ((SHARE_EVENTS as readonly string[]).includes(e.name)) stepUsers.shared.add(e.user_id);
    if (dayIndex(dayKey(e.created_at)) > s.day) stepUsers.returned.add(e.user_id);
  }
  const rawSteps: Array<[string, string, number]> = [
    ["signed_up", "Signed up", cohort.length],
    ["opened", "Opened the app", stepUsers.opened.size],
    ["started", "Started learning", stepUsers.started.size],
    ["done", "Finished something", stepUsers.done.size],
    ["returned", "Came back another day", stepUsers.returned.size],
    ["shared", "Shared a result", stepUsers.shared.size],
  ];
  const funnel: FunnelStep[] = rawSteps.map(([key, label, users], i) => ({
    key, label, users, ofSignups: pct(users, cohort.length), ofPrevious: i === 0 ? null : pct(users, rawSteps[i - 1][2]),
  }));

  // Weekly signup cohorts: rolling retention = active on day N after signup, or later.
  const mondayOf = (d: number) => d - ((new Date(d * DAY_MS).getUTCDay() + 6) % 7);
  const byWeek = new Map<number, string[]>();
  for (const [id, s] of signupOf) {
    const w = mondayOf(s.day);
    if (w >= mondayOf(today) - 7 * 5) (byWeek.get(w) ?? byWeek.set(w, []).get(w)!).push(id);
  }
  const retained = (ids: string[], n: number): number | null => {
    const eligible = ids.filter((id) => today >= signupOf.get(id)!.day + n);
    if (!eligible.length) return null;
    const back = eligible.filter((id) => [...(activeDays.get(id) ?? [])].some((d) => d >= signupOf.get(id)!.day + n));
    return pct(back.length, eligible.length);
  };
  const cohorts: CohortRow[] = [...byWeek.entries()].sort((a, b) => b[0] - a[0]).map(([w, ids]) => ({
    weekStart: new Date(w * DAY_MS).toISOString().slice(0, 10), size: ids.length, d1: retained(ids, 1), d7: retained(ids, 7), d30: retained(ids, 30),
  }));

  // Visitors: distinct browsers in the last 7 days (the top of the funnel, mostly signed out).
  const sevenDaysAgo = Date.parse(`${new Date((today - 6) * DAY_MS).toISOString().slice(0, 10)}T00:00:00Z`);
  const visitorIds = new Set<string>();
  let exports7d = 0;
  for (const e of known) {
    if (Date.parse(e.created_at) < sevenDaysAgo) continue;
    if (e.anonymous_id) visitorIds.add(e.anonymous_id);
    if (e.name === "output_exported") exports7d += 1;
  }
  const allCohortIds = [...byWeek.values()].flat();

  // Acquisition: split visitors by channel, setting bots aside so they do not look like students who bounced.
  const channelMap = new Map<string, { real: Set<string>; bots: Set<string>; mobile: Set<string> }>();
  const tapMap = new Map<string, { events: number; visitors: Set<string> }>();
  const tracked = new Set<string>();
  for (const e of known) {
    if (Date.parse(e.created_at) < sevenDaysAgo || !e.anonymous_id) continue;
    if (e.name === "landing_cta_clicked") {
      const cta = prop(e, "cta");
      if (cta) { const t = tapMap.get(cta) ?? { events: 0, visitors: new Set<string>() }; t.events += 1; t.visitors.add(e.anonymous_id); tapMap.set(cta, t); }
      continue;
    }
    if (e.name !== "session_started") continue;
    const channel = prop(e, "channel");
    if (!channel || channel === "internal") continue;
    const source = prop(e, "source");
    const label = source ? `${channel} · ${source}` : channel;
    const row = channelMap.get(label) ?? { real: new Set<string>(), bots: new Set<string>(), mobile: new Set<string>() };
    if (e.properties?.likely_bot === true) row.bots.add(e.anonymous_id);
    else { row.real.add(e.anonymous_id); tracked.add(e.anonymous_id); if (prop(e, "device") === "mobile") row.mobile.add(e.anonymous_id); }
    channelMap.set(label, row);
  }
  const channels: AcquisitionRow[] = [...channelMap.entries()]
    .map(([label, r]) => ({ label, visitors: r.real.size, bots: r.bots.size, mobilePct: pct(r.mobile.size, r.real.size) }))
    .filter((r) => r.visitors + r.bots > 0)
    .sort((a, b) => b.visitors - a.visitors || b.bots - a.bots);
  const landingTaps: CountRow[] = [...tapMap.entries()].map(([label, t]) => ({ label, events: t.events, users: t.visitors.size })).sort((a, b) => b.events - a.events);

  // Adoption of the retention/activation features.
  const actions = known.filter((e) => e.name === "learning_action_started");
  const firstStepEvents = actions.filter((e) => prop(e, "source") === "dashboard_first_lesson");
  const shares = known.filter((e) => e.name === "result_shared");

  const topMap = new Map<string, { events: number; users: Set<string> }>();
  for (const e of known) {
    const entry = topMap.get(e.name) ?? { events: 0, users: new Set<string>() };
    entry.events += 1;
    if (e.user_id) entry.users.add(e.user_id);
    topMap.set(e.name, entry);
  }

  return {
    generatedAt: now.toISOString(),
    headline: {
      signups7d, signupsPrev7d, signupsGrowthPct: signupsPrev7d > 0 ? Math.round(((signups7d - signupsPrev7d) / signupsPrev7d) * 100) : null,
      dau: uniq(dayActive.get(today)), active24h: active24.size, wau, mau, engagedWau: usersBetween(dayEngaged, today - 6, today), stickinessPct: pct(Math.round(dauSum / 7), mau),
      visitors7d: visitorIds.size, visitorToSignupPct: pct(signups7d, visitorIds.size), exports7d,
    },
    retention: { d1: retained(allCohortIds, 1), d7: retained(allCohortIds, 7), d30: retained(allCohortIds, 30), students: allCohortIds.length },
    series, funnel, cohorts,
    adoption: {
      actionSources: countBy(actions, (e) => prop(e, "source")),
      goalKinds: countBy(actions.filter((e) => prop(e, "source") === "dashboard_goal"), (e) => prop(e, "kind")),
      firstStep: {
        syllabus: firstStepEvents.filter((e) => e.properties?.curriculum_step === true).length,
        generic: firstStepEvents.filter((e) => e.properties?.curriculum_step !== true).length,
      },
      shares: countBy(shares, (e) => `${prop(e, "source") ?? "exam"} · ${prop(e, "channel") ?? "other"}`),
    },
    acquisition: { channels, landingTaps, trackedVisitors: tracked.size },
    topEvents: [...topMap.entries()].map(([label, v]) => ({ label, events: v.events, users: v.users.size })).sort((a, b) => b.users - a.users || b.events - a.events).slice(0, 12),
    health: {
      eventsAnalysed: known.length,
      anonymousPct: known.length ? pct(known.filter((e) => !e.user_id).length, known.length) : null,
      signupsKnown: signupOf.size,
    },
  };
}
