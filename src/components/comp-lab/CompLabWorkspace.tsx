"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Boxes, CheckCircle2, Code2, Database, FileSpreadsheet, Globe2, MonitorCog, TerminalSquare, Smartphone, Cpu, ChevronDown, Braces } from "lucide-react";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";
import { COMP_LAB_ENVIRONMENTS, type CompLabEnvironment } from "@/lib/comp-lab/environments";
import { getCapability } from "@/lib/platform/capabilities";
import ResizableCompLabWorkspace from "./ResizableCompLabWorkspace";
import WebCompLabWorkspace from "./WebCompLabWorkspace";
import CompLabIntelligencePanel from "./CompLabIntelligencePanel";
import AlgorithmStudioPlus from "./AlgorithmStudioPlus";
import CompLabProjectWorkspace from "./CompLabProjectWorkspace";
import ShadeCompLabWorkspace from "./ShadeCompLabWorkspace";

const ICONS = { console: TerminalSquare, web: Globe2, "windows-forms": MonitorCog, database: Database, spreadsheet: FileSpreadsheet, desktop: MonitorCog, mobile: Smartphone, systems: Cpu } as const;

function statusLabel(status: CompLabEnvironment["status"]) {
  if (status === "browser") return "Available now";
  if (status === "external-runtime") return "Native / external runtime";
  if (status === "artifact") return "Artifact workflow";
  return "Runtime planned";
}

function runtimeSummary(item: CompLabEnvironment) {
  if (item.status === "browser") return "Runs in the browser runtime";
  if (item.status === "external-runtime") return "Project editing is available now; execution uses the matching native or remote toolchain.";
  if (item.status === "artifact") return "Artifact editing and export are available now; the full Office/native application is used when required.";
  return "Capability registered, runtime not connected yet";
}

function capabilityFor(item: CompLabEnvironment) {
  if (item.id.includes("python")) return getCapability("runtime.python");
  if (item.id.includes("java")) return getCapability("runtime.java");
  if (item.id.includes("csharp") || item.id.includes("vbnet")) return getCapability("runtime.dotnet");
  if (item.id.includes("sql")) return getCapability("runtime.sql");
  if (item.id === "javascript-console" || item.id === "web") return getCapability("runtime.javascript");
  if (item.languages.includes("cpp")) return getCapability("runtime.cpp");
  if (item.languages.includes("c")) return getCapability("runtime.c");
  return null;
}

function EnvironmentIcon({ environment, className = "h-5 w-5" }: { environment: CompLabEnvironment; className?: string }) {
  const Icon = ICONS[environment.projectType];
  return environment.id === "shade-console" ? <Braces className={className} /> : <Icon className={className} />;
}

function StudentBackButton({ router }: { router: ReturnType<typeof useRouter> }) {
  return <button type="button" onClick={() => router.push("/dashboard")} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" title="Return to Shadecode Student"><ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Student</span></button>;
}

export default function CompLabWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedEnvironment = searchParams.get("env");
  const [launcherId, setLauncherId] = useState<string | null>(requestedEnvironment);

  useEffect(() => setLauncherId(requestedEnvironment), [requestedEnvironment]);

  const selectedId = launcherId && COMP_LAB_ENVIRONMENTS.some(item => item.id === launcherId) ? launcherId : null;
  const selected = selectedId ? COMP_LAB_ENVIRONMENTS.find(item => item.id === selectedId) ?? null : null;
  const selectedIsShadeWorkspace = selected?.id === "shade-console";
  const selectedIsCodeWorkspace = selected?.id === "javascript-console";
  const selectedIsWebWorkspace = selected?.id === "web";
  const selectedIsAlgorithmWorkspace = selected?.id === "pseudocode";
  const capability = useMemo(() => selected ? capabilityFor(selected) : null, [selected]);

  const openEnvironment = (id: string) => {
    setLauncherId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("env", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeEnvironment = () => {
    setLauncherId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("env");
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  };

  if (!selected) {
    return (
      <main className="flex min-h-full w-full flex-col bg-[var(--background)]">
        <nav aria-label="Comp Lab navigation" className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-[var(--card-border)] bg-[var(--surface)]/95 px-3 backdrop-blur sm:px-5">
          <StudentBackButton router={router} />
          <div className="hidden h-5 w-px bg-[var(--card-border)] sm:block" />
          <div className="flex min-w-0 flex-1 items-center gap-2"><ShadecodeFeatureIcon feature="code-lab" size="sm" /><div className="min-w-0"><p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Shadecode Student</p><p className="truncate text-sm font-semibold text-[var(--foreground)]">Comp Lab</p></div></div>
        </nav>
        <section className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] shadow-sm">
            <header className="border-b border-[var(--card-border)] p-5 sm:p-8">
              <div className="flex items-start gap-4"><ShadecodeFeatureIcon feature="code-lab" size="md" /><div className="min-w-0"><p className="ssc-kicker ssc-brand-gradient">Shadecode Student</p><h1 className="text-3xl font-bold text-[var(--foreground)]">Comp Lab</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Your computing workspace. Pick what you are building, then Comp Lab gives you the tools for that environment.</p></div></div>
            </header>
            <div className="p-4 sm:p-6 lg:p-8"><div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-sm font-semibold text-[var(--foreground)]">Choose an environment</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Every environment opens a usable project surface. Runtime status is explicit, so Comp Lab never pretends a native toolchain exists when it does not.</p></div><span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[10px] text-[var(--muted-foreground)]">{COMP_LAB_ENVIRONMENTS.length} environments</span></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{COMP_LAB_ENVIRONMENTS.map(item => <button key={item.id} type="button" onClick={() => openEnvironment(item.id)} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><EnvironmentIcon environment={item} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{item.label}</h3><ChevronDown className="h-4 w-4 -rotate-90 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5" /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{item.description}</p><div className="mt-3 flex items-center gap-2"><span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{statusLabel(item.status)}</span>{item.languages.slice(0, 2).map(language => <span key={language} className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{language}</span>)}</div></div></div></button>)}</div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-full w-full flex-col bg-[var(--background)]">
      <nav aria-label="Comp Lab navigation" className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-[var(--card-border)] bg-[var(--surface)]/95 px-3 backdrop-blur sm:px-5">
        <StudentBackButton router={router} /><button type="button" onClick={closeEnvironment} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[var(--card-border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" title="View all Comp Lab environments"><Boxes className="h-4 w-4" /> <span className="hidden md:inline">Environments</span></button><div className="hidden h-5 w-px bg-[var(--card-border)] sm:block" /><div className="flex min-w-0 flex-1 items-center gap-2"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--primary-glow)] text-[var(--primary)]"><EnvironmentIcon environment={selected} className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Comp Lab</p><p className="truncate text-sm font-semibold text-[var(--foreground)]">{selected.label}</p></div></div><label className="relative hidden min-w-[210px] sm:block"><span className="sr-only">Switch environment</span><select value={selected.id} onChange={event => openEnvironment(event.target.value)} className="w-full appearance-none rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] py-2 pl-3 pr-8 text-xs font-medium text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--primary)]">{COMP_LAB_ENVIRONMENTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" /></label><button type="button" onClick={closeEnvironment} className="sm:hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">Switch</button>
      </nav>

      <section className="border-b border-[var(--card-border)] bg-[var(--surface)] px-4 py-4 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)]"><EnvironmentIcon environment={selected} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-semibold text-[var(--foreground)]">{selected.label}</h1>{selected.status === "browser" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</div><p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted-foreground)]">{selected.description}</p><div className="mt-2 flex flex-wrap gap-1.5">{selected.curriculumTags.slice(0, 6).map(tag => <span key={tag} className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{tag}</span>)}</div></div></div><div className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--surface-muted)]/50 p-3 sm:w-auto sm:min-w-[280px]"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Runtime</span><span className={`rounded-full px-2 py-1 text-[10px] ${capability?.availability === "available" || selected.id === "pseudocode" || selectedIsShadeWorkspace ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{selectedIsShadeWorkspace ? "available" : selected.id === "pseudocode" ? "available" : capability?.availability ?? statusLabel(selected.status)}</span></div><p className="mt-1 text-xs text-[var(--muted-foreground)]">{runtimeSummary(selected)}</p></div></div></section>

      <section className="flex-1 p-2 sm:p-5 lg:p-6">{selectedIsShadeWorkspace ? <ShadeCompLabWorkspace /> : selectedIsCodeWorkspace ? <><ResizableCompLabWorkspace /><CompLabIntelligencePanel /></> : selectedIsWebWorkspace ? <WebCompLabWorkspace /> : selectedIsAlgorithmWorkspace ? <AlgorithmStudioPlus /> : <CompLabProjectWorkspace environment={selected} />}</section>
      <footer className="border-t border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted-foreground)]"><Code2 className="mr-2 inline h-4 w-4" />Pick an environment, build something, run it, understand what happened, and keep improving.</footer>
    </main>
  );
}
