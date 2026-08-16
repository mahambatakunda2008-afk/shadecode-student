import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ExportMenu from "@/components/exports/ExportMenu";
import ExperimentToggle from "@/components/admin/ExperimentToggle";

export const dynamic = "force-dynamic";

type TractionMetrics = {
  retention?: { d1?: number; d7?: number; d30?: number };
  activity?: { wau?: number; mau?: number; exports_7d?: number };
};

export default async function TractionAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/traction");

  const { data: isAdmin } = await supabase.rpc("has_role", { user_id: user.id, role_name: "admin" });
  if (!isAdmin) redirect("/dashboard");

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: users }, { count: events }, { count: responses }, { data: recentEvents }, { data: recentResponses }, { data: experiments }, { data: metrics }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("traction_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("survey_responses").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("traction_events").select("id,name,user_id,anonymous_id,path,properties,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    supabase.from("survey_responses").select("id,survey_id,user_id,answers,created_at").order("created_at", { ascending: false }).limit(25),
    supabase.from("experiments").select("id,key,name,hypothesis,variants,active,created_at").order("created_at", { ascending: false }),
    supabase.rpc("get_traction_metrics"),
  ]);

  const eventCounts = (recentEvents ?? []).reduce<Record<string, number>>((acc, event) => {
    acc[event.name] = (acc[event.name] ?? 0) + 1;
    return acc;
  }, {});
  const activation = eventCounts["activation_completed"] ?? 0;
  const sessions = eventCounts["session_started"] ?? 0;
  const activationRate = sessions ? Math.round((activation / sessions) * 100) : 0;
  const typedMetrics = (metrics ?? null) as TractionMetrics | null;
  const retention = typedMetrics?.retention ?? {};
  const activity = typedMetrics?.activity ?? {};

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Shadecode operator console</p><h1 className="mt-2 text-3xl font-black tracking-tight">Traction Command Center</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">Measure what students do, listen to why they do it, and turn evidence into product decisions.</p></div><ExportMenu filename="shadecode-traction-events" data={recentEvents ?? []} label="Export events" exportType="traction_events" sourceType="admin_traction" /></div>
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Total students" value={users ?? 0} /><Metric label="WAU" value={activity.wau ?? 0} /><Metric label="MAU" value={activity.mau ?? 0} /><Metric label="Activation · 7d" value={`${activationRate}%`} /></section>
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="D1 retention" value={`${retention.d1 ?? 0}%`} /><Metric label="D7 retention" value={`${retention.d7 ?? 0}%`} /><Metric label="D30 retention" value={`${retention.d30 ?? 0}%`} /><Metric label="Exports · 7d" value={activity.exports_7d ?? 0} /></section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Event signals · 7d</h2><span className="text-xs text-zinc-500">{recentEvents?.length ?? 0} recent</span></div><div className="space-y-2">{Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => <div key={name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><span className="text-sm">{name}</span><span className="text-sm font-bold text-cyan-300">{count}</span></div>)}{Object.keys(eventCounts).length === 0 && <p className="text-sm text-zinc-500">No traction events yet. The instrumentation is ready for the next user session.</p>}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Experiments</h2><span className="text-xs text-zinc-500">{experiments?.length ?? 0}</span></div><div className="mt-4 space-y-3">{(experiments ?? []).map((experiment) => <div key={experiment.id} className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{experiment.name}</strong><ExperimentToggle id={experiment.id} active={experiment.active} /></div><p className="mt-1 text-xs leading-5 text-zinc-400">{experiment.hypothesis}</p><p className="mt-2 font-mono text-[10px] text-zinc-600">{experiment.key}</p></div>)}</div></div>
        </section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Latest student feedback</h2><p className="mt-1 text-xs text-zinc-500">{responses ?? 0} responses in the last 7 days</p></div><ExportMenu filename="shadecode-survey-responses" data={recentResponses ?? []} label="Export feedback" exportType="survey_responses" sourceType="survey" /></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-zinc-500"><tr><th className="pb-3">Time</th><th className="pb-3">User</th><th className="pb-3">Answers</th></tr></thead><tbody>{(recentResponses ?? []).map((response) => <tr key={response.id} className="border-t border-white/5"><td className="py-3 text-zinc-400">{new Date(response.created_at).toLocaleString()}</td><td className="py-3 font-mono text-xs">{response.user_id ?? "anonymous"}</td><td className="max-w-xl py-3 text-zinc-300">{JSON.stringify(response.answers)}</td></tr>)}</tbody></table>{!recentResponses?.length && <p className="py-6 text-sm text-zinc-500">No survey responses yet.</p>}</div></section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
