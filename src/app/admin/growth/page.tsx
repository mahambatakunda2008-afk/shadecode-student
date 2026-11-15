import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadGrowthReport, loadAiHealth, EVENT_WINDOW_DAYS } from "@/lib/admin/loadGrowthReport";
import type { CountRow } from "@/lib/admin/growthReport";

export const dynamic = "force-dynamic";

export default async function GrowthAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/growth");
  const { data: isAdmin } = await supabase.rpc("has_role", { user_id: user.id, role_name: "admin" });
  if (!isAdmin) redirect("/dashboard");

  // Admin-only reads use the service role (after the check above) so row-level security can never turn
  // real activity into silent zeros on this page.
  const reader = createSupabaseAdminClient() ?? supabase;
  const [{ report, eventsTruncated, eventsFailed, signupSource }, ai] = await Promise.all([loadGrowthReport(reader), loadAiHealth(reader)]);
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
          <Stat label="Active · last 24h" value={h.active24h} note={`${h.wau} this week · ${h.mau} this month`} />
          <Stat label="Learning this week" value={h.engagedWau} note={h.wau ? `${Math.round((h.engagedWau / h.wau) * 100)}% of weekly active` : "no activity"} />
          <Stat label="Stickiness (DAU/MAU)" value={h.stickinessPct === null ? "—" : `${h.stickinessPct}%`} note="avg daily ÷ monthly active" />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Visitors · 7d" value={h.visitors7d} note="distinct browsers, signed in or not" />
          <Stat label="Visitor → signup" value={h.visitorToSignupPct === null ? "—" : `${h.visitorToSignupPct}%`} note={`${h.signups7d} new students from ${h.visitors7d} visitors`} />
          <Stat label="Came back by D1" value={report.retention.d1 === null ? "—" : `${report.retention.d1}%`} note={`rolling, ${report.retention.students} students (6 wks)`} />
          <Stat label="Came back by D7" value={report.retention.d7 === null ? "—" : `${report.retention.d7}%`} note="active on day 7 or later" />
        </section>

        <Card title="AI reliability · 7d" sub="Share of AI attempts that worked, per feature. Each attempt is one provider try, so attempts exceed student requests. Low rates mean students are seeing errors or long waits">
          {ai.rows.length ? (
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-zinc-500"><tr><th className="pb-2">Feature</th><th className="pb-2">Worked</th><th className="pb-2">Attempts</th><th className="pb-2">Students</th><th className="pb-2">Never got one</th><th className="pb-2">Avg wait on fail</th><th className="pb-2">Top failure</th></tr></thead>
              <tbody>{ai.rows.map((f) => <tr key={f.feature} className="border-t border-white/5"><td className="py-2">{f.feature}</td><td className={f.successPct === null ? "text-zinc-600" : f.successPct >= 80 ? "font-bold text-emerald-300" : f.successPct >= 50 ? "text-amber-300" : "font-bold text-rose-300"}>{f.successPct === null ? "—" : `${f.successPct}%`}</td><td>{f.attempts}</td><td>{f.students}</td><td className={f.studentsWithoutSuccess ? "text-rose-300" : "text-zinc-500"}>{f.studentsWithoutSuccess}</td><td>{f.avgFailSeconds === null ? "—" : `${f.avgFailSeconds}s`}</td><td className="max-w-[260px] truncate text-xs text-zinc-400" title={f.topFailure ?? ""}>{f.topFailure ?? "—"}</td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-zinc-500">{ai.failed ? "The AI log could not be read." : "No AI attempts in the last 7 days."}</p>}
          <p className="mt-3 text-xs text-zinc-500">Full breakdown by provider and cost: <Link href="/admin/ai-usage" className="text-cyan-300 hover:underline">AI usage →</Link></p>
        </Card>

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
          <Card title="Where visitors come from · 7d" sub="Distinct browsers; bots and link previews are counted apart. Appears as new visits arrive" flush>
            {report.acquisition.channels.length ? <div className="space-y-1.5">{report.acquisition.channels.slice(0, 8).map((c) => <div key={c.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span className="truncate">{c.label}</span><span className="shrink-0 pl-3 text-xs text-zinc-400"><b className="text-cyan-300">{c.visitors}</b> visitors{c.mobilePct !== null && ` · ${c.mobilePct}% mobile`}{c.bots > 0 && ` · ${c.bots} bots`}</span></div>)}</div> : <p className="text-sm text-zinc-500">No tracked visits yet. This fills in as people arrive after the latest deploy.</p>}
          </Card>
          <Card title="Landing buttons tapped · 7d" sub="By distinct visitor" flush>
            <List rows={report.acquisition.landingTaps} empty="No landing taps recorded yet." />
          </Card>
        </section>

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
          Data health: {report.health.eventsAnalysed.toLocaleString()} events analysed{eventsTruncated ? " (hit the row cap, so older days are partial)" : ""}{eventsFailed ? " (event query failed, numbers may be incomplete)" : ""};
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
