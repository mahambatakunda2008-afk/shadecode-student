import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonRow } from "@/lib/curriculum";

export type ProjectDifficulty = "easy" | "medium" | "hard";
export type ProjectStatus = "locked" | "available" | "started" | "completed";

export type ProjectProgress = {
  status: ProjectStatus;
  progress: number;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
};

export type LearningProject = {
  id: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  estimatedMinutes: number;
  requiredLessons: string[];
  xpReward: number;
  source: "draft" | "curriculum";
  lessonTitles?: Record<string, string>;
  lessonProgress?: Record<string, number>;
  completedRequiredLessons: number;
  totalRequiredLessons: number;
  status: ProjectStatus;
  progress: number;
  lockedReason?: string;
  recommendation?: string;
};

export type ProjectDraft = {
  id?: string;
  type?: string;
  title: string;
  description?: string;
  difficulty?: ProjectDifficulty | string;
  estimatedMinutes?: number;
  estimatedTime?: number | string;
  estimated_time?: number | string;
  requiredLessons?: string[];
  required_lessons?: string[];
  lessonIds?: string[];
  xpReward?: number;
  xp_reward?: number;
  metadata?: Record<string, unknown>;
};

type InsightProgressRow = {
  id: string;
  title: string;
  metadata: Record<string, unknown> | null;
};

type ProjectDraftRow = {
  id: string;
  draft: ProjectDraft | null;
  created_at?: string | null;
};

const PROJECT_PROGRESS_PREFIX = "project:";
const PROJECT_PROGRESS_SUFFIX = ":progress";

function clampProgress(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(100, Math.max(0, Math.round(numberValue)));
}

function normalizeDifficulty(value: unknown): ProjectDifficulty {
  if (value === "hard" || value === "medium") return value;
  return "easy";
}

function normalizeEstimatedMinutes(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(15, Math.round(value));
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Math.max(15, Number(match[0]));
  }

  return fallback;
}

function normalizeRequiredLessons(draft: ProjectDraft) {
  const raw =
    draft.requiredLessons ??
    draft.required_lessons ??
    draft.lessonIds ??
    (Array.isArray(draft.metadata?.requiredLessons)
      ? (draft.metadata.requiredLessons as string[])
      : []);

  return Array.from(
    new Set(
      (raw ?? [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    )
  );
}

function createProgressTitle(projectId: string) {
  return `${PROJECT_PROGRESS_PREFIX}${projectId}${PROJECT_PROGRESS_SUFFIX}`;
}

function getProjectIdFromProgressTitle(title: string) {
  if (!title.startsWith(PROJECT_PROGRESS_PREFIX) || !title.endsWith(PROJECT_PROGRESS_SUFFIX)) {
    return null;
  }

  return title.slice(PROJECT_PROGRESS_PREFIX.length, -PROJECT_PROGRESS_SUFFIX.length);
}

function normalizeProjectFromDraft(row: ProjectDraftRow): LearningProject | null {
  const draft = row.draft ?? null;
  if (!draft) return null;

  const metadata = draft.metadata ?? {};
  const title = String(draft.title ?? "").trim();
  if (!title) return null;

  const difficulty = normalizeDifficulty(draft.difficulty ?? metadata.difficulty);
  const fallbackMinutes = difficulty === "hard" ? 150 : difficulty === "medium" ? 90 : 45;

  return {
    id: row.id,
    title,
    description: String(draft.description ?? metadata.description ?? "Build a project that applies your recent lessons."),
    difficulty,
    estimatedMinutes: normalizeEstimatedMinutes(
      draft.estimatedMinutes ?? draft.estimatedTime ?? draft.estimated_time ?? metadata.estimatedMinutes,
      fallbackMinutes
    ),
    requiredLessons: normalizeRequiredLessons(draft),
    xpReward: Math.max(25, Number(draft.xpReward ?? draft.xp_reward ?? metadata.xpReward ?? 100)),
    source: "draft",
    completedRequiredLessons: 0,
    totalRequiredLessons: 0,
    status: "available",
    progress: 0,
  };
}

function buildCurriculumProjects(lessons: LessonRow[]): LearningProject[] {
  const incomplete = lessons.filter((lesson) => (lesson.progress ?? 0) < 100);
  const completed = lessons.filter((lesson) => (lesson.progress ?? 0) >= 100);
  const candidates = completed.length >= 2 ? completed : lessons;

  if (candidates.length === 0) return [];

  const bySubject = candidates.reduce<Record<string, LessonRow[]>>((acc, lesson) => {
    const key = lesson.subject_id || "general";
    acc[key] = [...(acc[key] ?? []), lesson];
    return acc;
  }, {});

  return Object.entries(bySubject)
    .map(([subjectId, subjectLessons]) => {
      const sorted = [...subjectLessons]
        .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
        .slice(0, 4);

      if (sorted.length < 2 && lessons.length > 1) {
        sorted.push(...lessons.filter((lesson) => lesson.subject_id !== subjectId).slice(0, 2 - sorted.length));
      }

      const requiredLessons = sorted.map((lesson) => lesson.id);
      const titleSeed = sorted[0]?.title ?? "your lessons";
      const hardCount = sorted.filter((lesson) => lesson.difficulty === "hard").length;
      const difficulty: ProjectDifficulty =
        hardCount > 0 || sorted.length >= 4 ? "hard" : sorted.length >= 3 ? "medium" : "easy";

      return {
        id: `curriculum-${subjectId}-${requiredLessons.slice(0, 3).join("-")}`,
        title: `${titleSeed} build project`,
        description:
          incomplete.length > 0
            ? "Turn your current lesson path into a practical build. Finish the required lessons first, then complete the project for XP."
            : "Use completed lessons to build something concrete and prove the concepts outside the lesson flow.",
        difficulty,
        estimatedMinutes: difficulty === "hard" ? 150 : difficulty === "medium" ? 90 : 45,
        requiredLessons,
        xpReward: difficulty === "hard" ? 180 : difficulty === "medium" ? 120 : 80,
        source: "curriculum" as const,
        completedRequiredLessons: 0,
        totalRequiredLessons: 0,
        status: "available" as const,
        progress: 0,
        recommendation: "Recommended from your curriculum progress.",
      };
    })
    .slice(0, 4);
}

function applyStudentState(
  project: LearningProject,
  lessons: LessonRow[],
  progressByProjectId: Map<string, ProjectProgress>
): LearningProject {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const completedRequiredLessons = project.requiredLessons.filter((lessonId) => {
    return (lessonById.get(lessonId)?.progress ?? 0) >= 100;
  }).length;
  const totalRequiredLessons = project.requiredLessons.length;
  const prerequisiteProgress =
    totalRequiredLessons === 0 ? 100 : Math.round((completedRequiredLessons / totalRequiredLessons) * 100);
  const savedProgress = progressByProjectId.get(project.id);
  const status: ProjectStatus =
    savedProgress?.status === "completed"
      ? "completed"
      : savedProgress?.status === "started"
        ? "started"
        : prerequisiteProgress < 100
          ? "locked"
          : "available";
  const progress =
    status === "completed"
      ? 100
      : Math.max(savedProgress?.progress ?? 0, status === "locked" ? 0 : prerequisiteProgress === 100 ? 0 : prerequisiteProgress);

  return {
    ...project,
    completedRequiredLessons,
    totalRequiredLessons,
    status,
    progress,
    lessonTitles: Object.fromEntries(
      project.requiredLessons.map((lessonId) => [lessonId, lessonById.get(lessonId)?.title ?? "Lesson"])
    ),
    lessonProgress: Object.fromEntries(
      project.requiredLessons.map((lessonId) => [lessonId, lessonById.get(lessonId)?.progress ?? 0])
    ),
    lockedReason:
      status === "locked"
        ? `Complete ${totalRequiredLessons - completedRequiredLessons} required lesson${
            totalRequiredLessons - completedRequiredLessons === 1 ? "" : "s"
          } first.`
        : undefined,
  };
}

async function getAuthenticatedUserId(supabase: SupabaseClient, userId?: string) {
  if (userId) return userId;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

async function loadLessons(supabase: SupabaseClient, userId: string): Promise<LessonRow[]> {
  const { data, error } = await supabase
    .from("learn_lessons")
    .select("id, title, subject_id, difficulty, progress, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[projects] lesson load failed:", error);
    return [];
  }

  return (data ?? []) as LessonRow[];
}

async function loadDraftProjects(supabase: SupabaseClient, userId: string): Promise<LearningProject[]> {
  const { data, error } = await supabase
    .from("generated_course_drafts")
    .select("id, draft, created_at")
    .eq("user_id", userId)
    .filter("draft->>type", "eq", "project")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects] draft load failed:", error);
    return [];
  }

  return ((data ?? []) as ProjectDraftRow[])
    .map(normalizeProjectFromDraft)
    .filter((project): project is LearningProject => Boolean(project));
}

async function loadProjectProgress(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("insights")
    .select("id, title, metadata")
    .eq("user_id", userId)
    .like("title", `${PROJECT_PROGRESS_PREFIX}%${PROJECT_PROGRESS_SUFFIX}`);

  if (error) {
    console.error("[projects] progress load failed:", error);
    return new Map<string, ProjectProgress>();
  }

  const progressByProjectId = new Map<string, ProjectProgress>();
  for (const row of (data ?? []) as InsightProgressRow[]) {
    const projectId = getProjectIdFromProgressTitle(row.title);
    if (!projectId) continue;

    const metadata = row.metadata ?? {};
    const status =
      metadata.status === "completed"
        ? "completed"
        : metadata.status === "started"
          ? "started"
          : "available";

    progressByProjectId.set(projectId, {
      status,
      progress: status === "completed" ? 100 : clampProgress(metadata.progress),
      startedAt: typeof metadata.started_at === "string" ? metadata.started_at : null,
      completedAt: typeof metadata.completed_at === "string" ? metadata.completed_at : null,
      updatedAt: typeof metadata.updated_at === "string" ? metadata.updated_at : null,
    });
  }

  return progressByProjectId;
}

async function upsertProjectProgress(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  next: ProjectProgress
) {
  const title = createProgressTitle(projectId);
  const now = new Date().toISOString();
  const metadata = {
    projectId,
    status: next.status,
    progress: clampProgress(next.progress),
    started_at: next.startedAt ?? (next.status === "started" || next.status === "completed" ? now : null),
    completed_at: next.completedAt ?? (next.status === "completed" ? now : null),
    updated_at: now,
  };

  const { data } = await supabase
    .from("insights")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();

  if (data?.id) {
    await supabase
      .from("insights")
      .update({
        content: next.status === "completed" ? `Project ${projectId} completed` : `Progress ${metadata.progress}%`,
        metadata: { ...(data.metadata ?? {}), ...metadata },
      })
      .eq("id", data.id);
    return;
  }

  await supabase.from("insights").insert({
    user_id: userId,
    title,
    content: next.status === "completed" ? `Project ${projectId} completed` : `Progress ${metadata.progress}%`,
    metadata,
  });
}

export async function listProjects(userId?: string, client?: SupabaseClient) {
  const supabase = client ?? (await createSupabaseServerClient());
  const resolvedUserId = await getAuthenticatedUserId(supabase, userId);
  const [lessons, draftProjects, progressByProjectId] = await Promise.all([
    loadLessons(supabase, resolvedUserId),
    loadDraftProjects(supabase, resolvedUserId),
    loadProjectProgress(supabase, resolvedUserId),
  ]);

  const draftRequiredLessonIds = new Set(draftProjects.flatMap((project) => project.requiredLessons));
  const curriculumProjects = buildCurriculumProjects(
    lessons.filter((lesson) => !draftRequiredLessonIds.has(lesson.id))
  );

  const projects = [...draftProjects, ...curriculumProjects]
    .map((project) => applyStudentState(project, lessons, progressByProjectId))
    .sort((a, b) => {
      const rank: Record<ProjectStatus, number> = { started: 0, available: 1, locked: 2, completed: 3 };
      return rank[a.status] - rank[b.status] || b.xpReward - a.xpReward;
    });

  return projects;
}

export async function getProjectById(id: string, userId?: string, client?: SupabaseClient) {
  const projects = await listProjects(userId, client);
  return projects.find((project) => project.id === id) ?? null;
}

export async function getProjectSummary(userId?: string, client?: SupabaseClient) {
  const projects = await listProjects(userId, client);
  const activeProjects = projects.filter((project) => project.status === "started");
  const completedProjects = projects.filter((project) => project.status === "completed");
  const recommendedProject =
    activeProjects[0] ?? projects.find((project) => project.status === "available") ?? projects[0] ?? null;

  return {
    totalProjects: projects.length,
    activeProjectCount: activeProjects.length,
    completedProjectCount: completedProjects.length,
    recommendedProject,
  };
}

export async function startProjectForUser(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  const project = await getProjectById(projectId, userId, supabase);

  if (!project) throw new Error("Project not found");
  if (project.status === "locked") throw new Error(project.lockedReason ?? "Project is locked");
  if (project.status === "completed") return { success: true, alreadyCompleted: true };

  await upsertProjectProgress(supabase, userId, projectId, {
    status: "started",
    progress: Math.max(project.progress, 1),
    startedAt: new Date().toISOString(),
  });

  return { success: true };
}

export async function updateProjectProgress(projectId: string, progress: number) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  const project = await getProjectById(projectId, userId, supabase);

  if (!project) throw new Error("Project not found");
  if (project.status === "locked") throw new Error(project.lockedReason ?? "Project is locked");

  const clamped = clampProgress(progress);
  await upsertProjectProgress(supabase, userId, projectId, {
    status: clamped >= 100 ? "completed" : "started",
    progress: clamped,
    startedAt: new Date().toISOString(),
    completedAt: clamped >= 100 ? new Date().toISOString() : null,
  });

  try {
    const { emitEvent } = await import("../../cortex/eventEmitter");
    emitEvent({
      type: "feature_opportunity",
      signal: "project_progress",
      module: "projects",
      severity: "low",
      hint: `project ${projectId} progress ${clamped}%`,
    });
  } catch {}

  return { success: true, progress: clamped };
}

async function awardProjectXp(supabase: SupabaseClient, userId: string, project: LearningProject) {
  try {
    await supabase.rpc("increment_xp", { user_id: userId, amount: project.xpReward });
  } catch (rpcError) {
    console.error("[projects] increment_xp failed:", rpcError);
    try {
      const { data: profile } = await supabase.from("profiles").select("xp, level").eq("id", userId).single();
      const nextXp = Number(profile?.xp ?? 0) + project.xpReward;
      const nextLevel = Math.floor(nextXp / 100) + 1;
      await supabase.from("profiles").update({ xp: nextXp, level: nextLevel }).eq("id", userId);
    } catch (profileError) {
      console.error("[projects] profile xp fallback failed:", profileError);
    }
  }

  try {
    await supabase.from("xp").insert({
      user_id: userId,
      amount: project.xpReward,
      source: "project",
      project_id: project.id,
      created_at: new Date().toISOString(),
    });
  } catch (xpLogError) {
    console.error("[projects] xp log failed:", xpLogError);
  }
}

export async function completeProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(supabase);
  const project = await getProjectById(projectId, userId, supabase);

  if (!project) throw new Error("Project not found");
  if (project.status === "locked") throw new Error(project.lockedReason ?? "Project is locked");
  if (project.status === "completed") {
    return { success: true, alreadyCompleted: true, xpAwarded: 0 };
  }

  await upsertProjectProgress(supabase, userId, projectId, {
    status: "completed",
    progress: 100,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  await awardProjectXp(supabase, userId, project);

  try {
    const { emitEvent } = await import("../../cortex/eventEmitter");
    emitEvent({
      type: "feature_opportunity",
      signal: "project_completed",
      module: "projects",
      severity: "medium",
      hint: `project ${projectId} completed by user ${userId}`,
    });
  } catch {}

  return { success: true, xpAwarded: project.xpReward };
}
