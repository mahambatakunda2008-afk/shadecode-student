"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Lock, Play, SlidersHorizontal, Trophy } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import ProgressBar from "@/components/ProgressBar";
import { cn } from "@/lib/utils";
import type { LearningProject, ProjectStatus } from "@/lib/projects";

type Filter = "all" | ProjectStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "started", label: "Started" },
  { id: "completed", label: "Completed" },
  { id: "locked", label: "Locked" },
];

const statusStyles: Record<ProjectStatus, string> = {
  available: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  started: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
  completed: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  locked: "border-white/10 bg-white/[0.04] text-white/45",
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function statusIcon(status: ProjectStatus) {
  if (status === "completed") return CheckCircle2;
  if (status === "started") return Play;
  if (status === "locked") return Lock;
  return Trophy;
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<LearningProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Failed to load projects.");
      setProjects(data.projects ?? []);
    } catch (loadError: any) {
      setError(loadError?.message ?? "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleProjects = useMemo(() => {
    if (filter === "all") return projects;
    return projects.filter((project) => project.status === filter);
  }, [filter, projects]);

  const counts = useMemo(() => {
    return projects.reduce<Record<Filter, number>>(
      (acc, project) => {
        acc.all += 1;
        acc[project.status] += 1;
        return acc;
      },
      { all: 0, available: 0, started: 0, completed: 0, locked: 0 }
    );
  }, [projects]);

  async function startProject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch("/api/projects?action=start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Could not start project.");
      await load();
    } catch (startError: any) {
      setError(startError?.message ?? "Could not start project.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-36 rounded-[8px] border border-white/[0.06] bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Project state</span>
        </div>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-[8px] border px-3 py-2 text-xs font-semibold transition-colors",
              filter === item.id
                ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200"
                : "border-white/[0.06] bg-white/[0.025] text-white/45 hover:text-white/75"
            )}
          >
            {item.label} {counts[item.id]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-[8px] border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {visibleProjects.length === 0 ? (
        <div className="rounded-[8px] border border-white/[0.06] bg-white/[0.025] p-5 text-sm text-white/50">
          No projects match this filter.
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleProjects.map((project) => {
            const StatusIcon = statusIcon(project.status);
            const canStart = project.status === "available";
            return (
              <article
                key={project.id}
                className="rounded-[8px] border border-white/[0.07] bg-[#11111b] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[8px] border px-2 py-1 text-[11px] font-semibold capitalize",
                          statusStyles[project.status]
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {project.status}
                      </span>
                      <span className="rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold capitalize text-white/55">
                        {project.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-white/55">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatMinutes(project.estimatedMinutes)}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{project.title}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-white/55">{project.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/projects/${encodeURIComponent(project.id)}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => void startProject(project.id)}
                      disabled={!canStart || busyId === project.id}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      {busyId === project.id ? "Starting" : "Start"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <ProgressBar value={project.progress} max={100} />
                    {project.lockedReason && (
                      <p className="mt-2 text-xs text-white/40">{project.lockedReason}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[8px] border border-white/[0.06] bg-white/[0.025] p-3">
                      <p className="text-white/40">Required</p>
                      <p className="mt-1 font-semibold text-white">
                        {project.completedRequiredLessons}/{project.totalRequiredLessons}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-white/[0.06] bg-white/[0.025] p-3">
                      <p className="text-white/40">Reward</p>
                      <p className="mt-1 font-semibold text-white">+{project.xpReward} XP</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
