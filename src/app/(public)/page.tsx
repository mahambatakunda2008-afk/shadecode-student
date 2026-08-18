"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BrainCircuit, BookOpen, Calculator, Check, ChevronDown, LineChart, Sparkles, Target, WifiOff, Zap } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { BrandMark } from "@/components/brand/BrandMark";

const features = [
  { icon: BrainCircuit, label: "Cortex", title: "Learning intelligence", body: "Your lessons, attempts, mistakes and progress become evidence for better next steps." },
  { icon: BookOpen, label: "Learn", title: "Lessons that adapt", body: "Study concepts with explanations and practice that can respond to what you already know." },
  { icon: Calculator, label: "Math Checker", title: "Understand the mistake", body: "Work through mathematical reasoning and identify where an answer or method went off course." },
  { icon: Target, label: "Exam Simulation", title: "Practice under pressure", body: "Timed practice turns exam performance into useful signals for revision and future study." },
  { icon: LineChart, label: "Progress", title: "See the learning state", body: "XP, streaks, tasks, achievements and analytics make consistency visible without becoming the point." },
  { icon: WifiOff, label: "Offline", title: "Designed for imperfect internet", body: "The product is built as a PWA with an offline-first direction for real student conditions." },
];

const loop = [
  ["01", "Observe", "Capture study behaviour, attempts, results and mistakes."],
  ["02", "Understand", "Build a clearer picture of concepts, mastery and recurring patterns."],
  ["03", "Predict", "Estimate what needs attention and which intervention may help."],
  ["04", "Act", "Give the student a concrete next action instead of another generic tip."],
  ["05", "Evaluate", "Check whether the intervention actually changed the next outcome."],
  ["06", "Learn", "Feed the result back into the learning state."],
];

const faqs = [
  ["Is Shadecode Student free?", "Students can start with the free experience. Paid capabilities can be introduced without breaking the core study loop."],
  ["Does it work on phones?", "Yes. Shadecode Student is designed as a responsive PWA for phones, tablets and desktop browsers."],
  ["Can I use it with weak internet?", "Offline capability is a core product direction. The application is designed to degrade gracefully when connectivity is unreliable."],
  ["Who is it for?", "It is designed for students across secondary school, university and polytechnic study, with exam-oriented workflows as a major use case."],
];

export default function PublicHomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111C] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#06111C]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Shadecode Student home"><BrandLockup compact /></Link>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <a href="#intelligence" className="text-sm text-slate-400 transition hover:text-white">Intelligence</a>
            <a href="#features" className="text-sm text-slate-400 transition hover:text-white">Features</a>
            <a href="#future" className="text-sm text-slate-400 transition hover:text-white">Future</a>
            <a href="#faq" className="text-sm text-slate-400 transition hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white sm:inline-flex">Sign in</Link>
            <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#22D3EE] px-3.5 py-2 text-sm font-semibold text-[#06111C] shadow-[0_8px_30px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-[#67E8F9]">Get started <ArrowRight size={15} /></Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(14,165,233,.08),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-32 lg:pt-28">
          <div>
            <div className="mb-7"><BrandLockup /></div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-[.12em] text-[#67E8F9]"><Sparkles size={13} /> Study smarter. Live sharper.</div>
            <h1 className="max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[1.03] tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">A learning system that <span className="text-[#22D3EE]">learns how you learn.</span></h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Lessons, questions, mistakes, exams, revision and study behaviour become one evolving learning experience, with Cortex helping decide what should happen next.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#22D3EE] px-5 py-3 font-semibold text-[#06111C] shadow-[0_12px_36px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-[#67E8F9]">Start studying free <ArrowRight size={17} /></Link>
              <a href="#intelligence" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]">See how it works</a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>Responsive PWA</span><span>AI-powered</span><span>Offline-first direction</span><span>Built for students</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute inset-8 rounded-full bg-[#22D3EE]/10 blur-3xl" />
            <div className="relative rounded-[28px] border border-white/10 bg-[#0B1724]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><div className="flex items-center gap-3"><BrandMark className="h-8 w-8 text-[#22D3EE]" aria-hidden="true" /><div><div className="font-[var(--font-brand)] text-[10px] tracking-[.12em] text-white">SHADECODE</div><div className="font-[var(--font-brand)] text-[6px] tracking-[.38em] text-slate-500">STUDENT</div></div></div><span className="flex items-center gap-1.5 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Cortex active</span></div>
              <div className="grid grid-cols-3 gap-2 py-4"><Metric label="XP" value="2,450" /><Metric label="Streak" value="12d" /><Metric label="Level" value="12" /></div>
              <div className="rounded-2xl border border-[#22D3EE]/15 bg-[#22D3EE]/[0.045] p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#67E8F9]">Today’s challenge</div><div className="mt-1 text-sm font-semibold text-white">Solve 3 mechanics problems</div></div><Zap className="text-[#22D3EE]" size={20} /></div><p className="mt-2 text-xs leading-5 text-slate-500">Targeted practice based on recent performance.</p><div className="mt-4 flex items-center justify-between"><span className="text-xs font-semibold text-[#67E8F9]">+20 XP</span><button className="rounded-lg bg-[#22D3EE] px-3 py-1.5 text-xs font-semibold text-[#06111C]">Start</button></div></div>
              <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-white"><BrainCircuit size={15} className="text-[#22D3EE]" /> Latest insight</div><p className="mt-2 text-xs leading-5 text-slate-400">Your strongest focus window is 9–11 AM. Try scheduling your hardest subject there.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="intelligence" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center"><span className="text-xs font-semibold uppercase tracking-[.16em] text-[#22D3EE]">The Cortex loop</span><h2 className="mt-4 font-[var(--font-display)] text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">From answers to understanding the learner.</h2><p className="mt-4 leading-7 text-slate-400">The advantage is not a larger chatbot. It is a system that remembers evidence, tests interventions and improves its understanding over time.</p></div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{loop.map(([number,title,body]) => <div key={number} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#22D3EE]/20"><span className="text-xs font-semibold text-[#22D3EE]">{number}</span><h3 className="mt-3 font-[var(--font-display)] text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div>)}</div>
      </section>

      <section id="features" className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><span className="text-xs font-semibold uppercase tracking-[.16em] text-[#22D3EE]">The toolkit</span><h2 className="mt-4 font-[var(--font-display)] text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Many tools. One learning system.</h2></div><div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, label, title, body }) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#0B1724]/70 p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#22D3EE]/[0.08] text-[#22D3EE]"><Icon size={21} /></div><div className="mt-5 text-[11px] font-semibold uppercase tracking-[.12em] text-[#67E8F9]">{label}</div><h3 className="mt-2 font-[var(--font-display)] text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div>)}</div></div>
      </section>

      <section id="future" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-2 lg:items-center"><div><span className="text-xs font-semibold uppercase tracking-[.16em] text-[#22D3EE]">Where this goes</span><h2 className="mt-4 max-w-xl font-[var(--font-display)] text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">The next breakthrough is underneath the interface.</h2><p className="mt-5 max-w-xl leading-7 text-slate-400">The immediate priority is a reliable learning state. From there, Shadecode can investigate adaptive interventions, curriculum-to-mastery graphs, privacy-conscious student models and specialized local intelligence.</p><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">These are development directions, not claims that every piece already exists. Build the foundation, measure it, then expand.</p></div><div className="rounded-3xl border border-white/[0.07] bg-[#0B1724]/80 p-6"><div className="mb-5 text-[11px] font-semibold uppercase tracking-[.14em] text-[#22D3EE]">Research path</div>{["Learning State Engine","Adaptive Intervention Engine","Learning Graph","Privacy-conscious student model","Small local models","Model routing and compression"].map((item,index) => <div key={item} className="flex items-center gap-3 border-t border-white/[0.06] py-3.5 text-sm text-slate-300"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.04] text-xs text-[#22D3EE]">0{index+1}</span>{item}</div>)}</div></div></section>

      <section id="faq" className="border-t border-white/[0.06] bg-white/[0.015]"><div className="mx-auto max-w-3xl px-4 py-24 sm:px-6"><div className="text-center"><span className="text-xs font-semibold uppercase tracking-[.16em] text-[#22D3EE]">FAQ</span><h2 className="mt-4 font-[var(--font-display)] text-3xl font-semibold text-white">A few useful answers.</h2></div><div className="mt-10 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#0B1724]/70">{faqs.map(([question,answer],index) => <div key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-semibold text-white"><span>{question}</span><ChevronDown size={17} className={`shrink-0 text-[#22D3EE] transition-transform ${openFaq === index ? "rotate-180" : ""}`} /></button>{openFaq === index && <p className="px-5 pb-5 text-sm leading-6 text-slate-500">{answer}</p>}</div>)}</div></div></section>

      <footer className="border-t border-white/[0.07]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><BrandLockup compact /><div className="text-xs text-slate-600">Study smarter. Live sharper. · Built for students.</div><div className="flex gap-4 text-xs text-slate-500"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/auth/login" className="hover:text-white">Sign in</Link></div></div></footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="text-[10px] uppercase tracking-[.1em] text-slate-600">{label}</div><div className="mt-1 font-[var(--font-display)] text-lg font-semibold text-white">{value}</div></div>;
}
