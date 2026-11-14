import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { buildGrowthReport, type CountRow, type EventRow, type SignupRow } from "@/lib/admin/growthReport";

export const dynamic = "force-dynamic";

/** 45 days covers MAU (30d) and the D30 window of the newest cohorts we show. */
const EVENT_WINDOW_DAYS = 45;

export default async function GrowthAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/growth");
  const { data: isAdmin } = await supabase.rpc("has_role", { user_id: user.id, role_name: "admin" });
  if (!isAdmin) redirect("/dashboard");

  // Admin-only reads use the service role (after the check above) so row-level security can never turn
  // real activity into silent zeros on this page.
  const reader = createSupabaseAdminClient() ?? supabase;
  const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 86_400_000).toISOString();

  const [events, profiles] = await Promise.all([
    fetchAllRows<EventRow>((from, to) =>
      reader.from("traction_events").select("name,user_id,created_at,properties").gte("created_at", since).order("created_at", { ascending: false }).range(from, to)),
    fetchAllRows<SignupRow>((from, to) => reader.from("profiles").select("id,created_at").order("created_at", { ascending: false }).range(from, to)),
  ]);

  // If profiles has no usable signup dates, fall back to recorded signup events rather than showing nothing.
  let signups = profiles.rows.filter((p) => p.created_at);
  let signupSource = "profiles";
  if (profiles.failed || signups.length === 0) {
    signups = events.rows.filter((e) => e.name === "user_signed_up" && e.user_id).map((e) => ({ id: e.user_id as string, created_at: e.created_at }));
    signupSource = "user_signed_up events";
  }

  const report = buildGrowthReport({ events: events.rows, signups });
  const h = report.headline;
  const maxActive = Math.max(1, ...report.series.map((p) => p.active));

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Shadecode operator console</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Growth &amp; Retention</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Unique students, not event counts. Do they start, come back, and bring others?</p>
          </div>
          <Link href="/admin/traction" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">Traction &amp; feedback →</Link>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="New students · 7d" value={h.signups7d} note={h.signupsGrowthPct === null ? "no prior week" : `${h.signupsGrowthPct >= 0 ? "+" : ""}${h.signupsGrowthPct}% vs prior 7d`} />
          <Stat label="Active today (DAU)" value={h.dau} note={`${h.wau} this week · ${h.mau} this month`} />
          <Stat label="Learning this week" value={h.engagedWau} note={h.wau ? `${Math.round((h.engagedWau / h.wau) * 100)}% of weekly active` : "no activity"} />
          <Stat label="Stickiness (DAU/MAU)" value={h.stickinessPct === null ? "—" : `${h.stickinessPct}%`} note="avg daily ÷ monthly active" />
        </section>

        <Card title="Daily active students" sub="Last 14 days · bar = active, cyan = did learning">
          <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Daily active students, last 14 days">
            {report.series.map((p) => (
              <div key={p.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${p.day}: ${p.active} active, ${p.engaged} learning, ${p.signups} signups`}>
                <div className="relative w-full overflow-hidden rounded-t bg-white/15" style={{ height: `${Math.max(4, (p.active / maxActive) * 100)}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-cyan-400" style={{ height: p.active ? `${(p.engaged / p.active) * 100}%` : 0 }} />
                </div>
                <span className="text-[9px] text-zinc-500">{p.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Activation funnel" sub="Students who signed up in the last 14 days, counting only what they did after signing up">
          <div className="space-y-2.5">
            {report.funnel.map((step) => (
              <div key={step.key}>
                <div className="flex items-baseline justify-between text-sm"><span>{step.label}</span><span className="font-bold text-cyan-300">{step.users}{step.ofSignups !== null && <span className="ml-2 text-xs font-normal text-zinc-500">{step.ofSignups}% of signups{step.ofPrevious !== null && ` · ${step.ofPrevious}% of previous`}</span>}</span></div>
                <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${step.ofSignups ?? 0}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Retention by signup week" sub="Share of each cohort active on day N or later. Blank = not old enough yet">
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-zinc-500"><tr><th className="pb-2">Week of</th><th className="pb-2">Students</th><th className="pb-2">D1</th><th className="pb-2">D7</th><th className="pb-2">D30</th></tr></thead>
            <tbody>{report.cohorts.map((c) => <tr key={c.weekStart} className="border-t border-white/5"><td className="py-2 text-zinc-400">{c.weekStart}</td><td>{c.size}</td><Cell v={c.d1} /><Cell v={c.d7} /><Cell v={c.d30} /></tr>)}</tbody></table>
            {!report.cohorts.length && <p className="py-4 text-sm text-zinc-500">No signup cohorts in the last 6 weeks.</p>}</div>
        </Card>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="What students tap to start learning" sub="learning_action_started by source" flush>
            <List rows={report.adoption.actionSources} empty="No learning starts recorded yet." />
            <p className="mt-3 text-xs text-zinc-500">First lesson from the dashboard: <b className="text-zinc-300">{report.adoption.firstStep.syllabus}</b> from the syllabus · <b className="text-zinc-300">{report.adoption.firstStep.generic}</b> generic</p>
          </Card>
          <Card title="Today's goals clicked, by type" sub="dashboard_goal" flush>
            <List rows={report.adoption.goalKinds} empty="No goal clicks yet." />
          </Card>
          <Card title="Sharing" sub="result_shared by source · channel" flush>
            <List rows={report.adoption.shares} empty="No result shares yet." />
          </Card>
          <Card title="Events by unique students" sub={`Last ${EVENT_WINDOW_DAYS} days`} flush>
            <List rows={report.topEvents} empty="No events yet." />
          </Card>
        </section>

        <p className="mt-8 text-xs leading-5 text-zinc-500">
          Data health: {report.health.eventsAnalysed.toLocaleString()} events analysed{events.truncated ? " (hit the row cap, so older days are partial)" : ""}{events.failed ? " (event query failed, numbers may be incomplete)" : ""};
          {" "}{report.health.signupsKnown.toLocaleString()} signups from {signupSource}; {report.health.anonymousPct ?? 0}% of events have no signed-in student and are excluded from student counts. Days are UTC.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-400">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div>;
}
function Card({ title, sub, children, flush }: { title: string; sub?: string; children: React.ReactNode; flush?: boolean }) {
  return <section className={`${flush ? "" : "mt-6 "}rounded-2xl border border-white/10 bg-white/[0.03] p-5`}><h2 className="font-bold">{title}</h2>{sub && <p className="mt-1 mb-4 text-xs text-zinc-500">{sub}</p>}{children}</section>;
}
function Cell({ v }: { v: number | null }) {
  return <td className={v === null ? "text-zinc-600" : v >= 30 ? "font-bold text-emerald-300" : v >= 10 ? "text-amber-300" : "text-rose-300"}>{v === null ? "—" : `${v}%`}</td>;
}
function List({ rows, empty }: { rows: CountRow[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-zinc-500">{empty}</p>;
  return <div className="space-y-1.5">{rows.slice(0, 8).map((r) => <div key={r.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span className="truncate">{r.label}</span><span className="shrink-0 pl-3 text-xs text-zinc-400"><b className="text-cyan-300">{r.users}</b> students · {r.events}×</span></div>)}</div>;
}
