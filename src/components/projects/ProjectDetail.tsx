"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Lock, Play, Trophy } from "lucide-react";

import ProgressBar from "@/components/ProgressBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningProject } from "@/lib/projects";

type Props = {
  projectId: string;
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export default function ProjectDetail({ projectId }: Props) {
  const [project, setProject] = useState<LearningProject | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects?action=get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Project not found.");
      setProject(data.project);
      setProgress(data.project?.progress ?? 0);
    } catch (loadError: any) {
      setError(loadError?.message ?? "Project not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function postAction(action: "start" | "progress" | "complete", body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, ...body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Project update failed.");
      setMessage(
        action === "complete"
          ? data.xpAwarded > 0
            ? `Completed for +${data.xpAwarded} XP.`
            : "Project already completed."
          : "Project updated."
      );
      await load();
    } catch (actionError: any) {
      setError(actionError?.message ?? "Project update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-80 rounded-[8px] border border-white/[0.06] bg-white/[0.03] animate-pulse" />;
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <Link href="/projects" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Projects
        </Link>
        <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!project) return null;

  const isLocked = project.status === "locked";
  const isCompleted = project.status === "completed";
  const canStart = project.status === "available";
  const canUpdate = project.status === "started";

  return (
    <div className="space-y-5">
      <Link href="/projects" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Projects
      </Link>

      <section className="rounded-[8px] border border-white/[0.07] bg-[#11111b] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-[8px] border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[11px] font-semibold capitalize text-indigo-200">
                {project.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-white/55">
                <Clock3 className="h-3.5 w-3.5" />
                {formatMinutes(project.estimatedMinutes)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-[8px] border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
                <Trophy className="h-3.5 w-3.5" />
                +{project.xpReward} XP
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/58">{project.description}</p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button onClick={() => void postAction("start")} disabled={!canStart || busy} size="sm">
              <Play className="mr-1.5 h-4 w-4" />
              Start
            </Button>
            <Button
              onClick={() => void postAction("complete")}
              disabled={isLocked || isCompleted || busy}
              size="sm"
              variant="secondary"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>Project progress</span>
            <span>{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} max={100} />
        </div>

        {message && (
          <div className="mt-4 rounded-[8px] border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-[8px] border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[8px] border border-white/[0.07] bg-[#11111b] p-5">
          <h2 className="text-base font-bold text-white">Build Progress</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              disabled={!canUpdate || busy}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                disabled={!canUpdate || busy}
                onChange={(event) => setProgress(Math.min(100, Math.max(0, Number(event.target.value))))}
                className="h-9 w-20 rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-2 text-sm text-white"
              />
              <Button
                size="sm"
                disabled={!canUpdate || busy}
                onClick={() => void postAction("progress", { progress })}
              >
                Save
              </Button>
            </div>
          </div>
          {!canUpdate && (
            <p className="mt-3 text-xs text-white/40">
              Start the project before updating progress.
            </p>
          )}
        </div>

        <div className="rounded-[8px] border border-white/[0.07] bg-[#11111b] p-5">
          <h2 className="text-base font-bold text-white">Required Lessons</h2>
          <div className="mt-4 space-y-2">
            {project.requiredLessons.length === 0 ? (
              <p className="text-sm text-white/45">No required lessons.</p>
            ) : (
              project.requiredLessons.map((lessonId) => {
                const title = project.lessonTitles?.[lessonId] ?? "Lesson";
                const lessonProgress = project.lessonProgress?.[lessonId] ?? 0;
                const completed = lessonProgress >= 100;
                return (
                  <Link
                    key={lessonId}
                    href={`/learn/${encodeURIComponent(lessonId)}`}
                    className={cn(
                      "flex items-center justify-between rounded-[8px] border border-white/[0.06] bg-white/[0.025] p-3 text-sm transition-colors hover:bg-white/[0.05]",
                      completed ? "text-white/75" : "text-white/45"
                    )}
                  >
                    <span className="min-w-0 truncate">{title}</span>
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <span className="text-xs text-white/35">{lessonProgress}%</span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
