"use client";

import "./DashboardReimagined.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, CalendarClock, CheckCircle2, Flame, Loader2, Target, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentIntelligence } from "@/lib/student-intelligence";
import { withTimeout, TimeoutError } from "@/lib/async/withTimeout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TIMEOUT = 15000;
type Intelligence = any;

export default function DashboardReimagined() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<Intelligence | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(true);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Student");
  const [userId, setUserId] = useState<string | null>(null);

  const load = async (id: string) => {
    setIntelLoading(true);
    setIntelError(null);
    try {
      const result = await withTimeout(getStudentIntelligence(id), TIMEOUT, "Dashboard intelligence timed out");
      if (!result) throw new Error("No intelligence returned");
      setData(result);
    } catch (error) {
      setIntelError(error instanceof TimeoutError ? "Cortex took too long to respond." : "Cortex could not load your recommendations.");
    } finally {
      setIntelLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/auth/login"); return; }
      if (!alive) return;
      setUserId(auth.user.id);
      setUserName(auth.user.user_metadata?.full_name?.split(" ")[0] || auth.user.email?.split("@")[0] || "Student");
      void load(auth.user.id);
      const { data: examData } = await supabase.from("exams").select("id, subject, exam_date").eq("user_id", auth.user.id).gte("exam_date", new Date().toISOString().split("T")[0]).order("exam_date", { ascending: true }).limit(5);
      if (alive) setExams(examData || []);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardLoading />;

  const intel = data?.intelligence;
  const next = intel?.recommendations?.[0];
  const weak = intel?.weakAreas?.[0];
  const insight = intel?.insights?.[0];
  const progress = data?.progress?.overallCompletion;
  const score = data?.performance?.trends?.averageScore;
  const streak = data?.activity?.streak?.currentStreak;

  return (
    <main className="dashboard-command-center min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-col gap-1 sm:mb-8">
          <p className="dashboard-eyebrow text-xs font-semibold text-muted-foreground">Academic command center</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {userName}.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Here’s what matters most for your learning right now.</p>
        </header>

        <section className="mb-7" aria-labelledby="next-heading">
          <Card className="dashboard-hero">
            <CardContent className="relative z-10 p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Target className="h-4 w-4" aria-hidden="true" />Next move</div>
              {intelLoading ? <div className="flex items-center gap-3 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparing your next recommendation…</div> : next ? <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><h2 id="next-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">{next.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{next.description}</p></div><Button size="lg" className="dashboard-action shrink-0" onClick={() => router.push("/learn")}>Start <ArrowRight className="ml-2 h-4 w-4" /></Button></div> : <div><h2 id="next-heading" className="text-xl font-semibold">Nothing urgent right now.</h2><p className="mt-1 text-sm text-muted-foreground">Keep learning and Shadecode will use your new activity to shape what comes next.</p></div>}
            </CardContent>
          </Card>
        </section>

        <section aria-label="Momentum" className="mb-8 grid gap-3 sm:grid-cols-3">
          <Metric icon={<CheckCircle2 />} label="Progress" value={progress == null ? "—" : `${Math.round(progress)}%`} detail="Overall" />
          <Metric icon={<Flame />} label="Streak" value={streak == null ? "—" : `${streak} days`} detail="Current" />
          <Metric icon={<Trophy />} label="Average" value={score == null ? "—" : `${Math.round(score)}%`} detail="Recent work" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <div className="space-y-6">
            <section aria-labelledby="today-heading"><SectionTitle kicker="Keep moving" title="Today’s plan" />
              <Card><CardContent className="p-2 sm:p-3">{intel?.recommendations?.slice(0, 4).length ? intel.recommendations.slice(0, 4).map((item: any, i: number) => <button key={item.id || i} type="button" onClick={() => router.push("/learn")} className="dashboard-list-item flex w-full items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted"><Target className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.title}</span><span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">{item.description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>) : <p className="p-5 text-sm text-muted-foreground">Your plan will appear as Shadecode gathers more learning activity.</p>}</CardContent></Card>
            </section>

            <section aria-labelledby="upcoming-heading"><SectionTitle icon={<CalendarClock />} title="Next up" /><Card><CardContent className="divide-y p-0">{exams.length ? exams.map(exam => <button key={exam.id} type="button" onClick={() => router.push("/tasks")} className="dashboard-list-item flex w-full items-center justify-between gap-4 p-4 text-left"><span><span className="block text-sm font-medium">{exam.subject}</span><span className="text-xs text-muted-foreground">{new Date(exam.exam_date).toLocaleDateString()}</span></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></button>) : <p className="p-5 text-sm text-muted-foreground">No upcoming assessments to show.</p>}</CardContent></Card></section>
          </div>

          <aside className="space-y-6">
            <section aria-labelledby="focus-heading"><SectionTitle icon={<Target />} title="Focus area" /><Card><CardContent className="p-5">{weak ? <><h3 id="focus-heading" className="font-semibold">{weak.topic}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">This is currently one of the areas where focused practice can have the most impact.</p><Button variant="outline" className="mt-4" onClick={() => router.push("/learn")}>Practice <ArrowRight className="ml-2 h-4 w-4" /></Button></> : <p id="focus-heading" className="text-sm leading-6 text-muted-foreground">Complete more practice so Shadecode can identify your highest-impact focus area.</p>}</CardContent></Card></section>

            <section aria-labelledby="cortex-heading"><SectionTitle icon={<BrainCircuit className="text-primary" />} title="Cortex" /><Card className="dashboard-cortex border-primary/15"><CardContent className="p-5">{intelError ? <><h3 id="cortex-heading" className="font-semibold">Cortex is temporarily unavailable</h3><p className="mt-2 text-sm text-muted-foreground">{intelError}</p><Button variant="outline" className="mt-4" disabled={!userId || intelLoading} onClick={() => userId && load(userId)}>Retry</Button></> : insight ? <><h3 id="cortex-heading" className="font-semibold">{insight.title || "A useful signal"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.content}</p></> : <><h3 id="cortex-heading" className="font-semibold">Cortex is learning</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep learning. As Shadecode gathers evidence from your work, this space will become more useful.</p></>}</CardContent></Card></section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <Card className="shadow-none"><CardContent className="flex items-center gap-4 p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">{icon}</span><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="text-xl font-semibold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>; }
function SectionTitle({ kicker, title, icon }: { kicker?: string; title: string; icon?: React.ReactNode }) { return <div className="mb-3 flex items-end justify-between"><div>{kicker && <p className="dashboard-eyebrow mb-1 text-xs font-medium text-muted-foreground">{kicker}</p>}<h2 className="dashboard-section-heading flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2></div></div>; }
function DashboardLoading() { return <main className="dashboard-command-center mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8"><div className="animate-pulse space-y-5"><div className="h-10 w-72 rounded-lg bg-muted" /><div className="h-52 rounded-2xl bg-muted" /><div className="grid gap-3 sm:grid-cols-3"><div className="h-24 rounded-2xl bg-muted" /><div className="h-24 rounded-2xl bg-muted" /><div className="h-24 rounded-2xl bg-muted" /></div><div className="grid gap-6 lg:grid-cols-[1.45fr_.55fr]"><div className="h-72 rounded-2xl bg-muted" /><div className="h-72 rounded-2xl bg-muted" /></div></div></main>; }
