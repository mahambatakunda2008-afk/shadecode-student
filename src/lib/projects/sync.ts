import { mutationQueue } from "@/lib/offline/mutationQueue";
import { createClient } from "@/lib/supabase/client";

function projectRow(project: Record<string, unknown>, userId: string) {
  return {
    id: project.id, user_id: userId, title: project.title, subject: project.subject ?? "", board: project.board ?? "",
    academic_stage: project.academicStage ?? "secondary", grade_or_form: project.gradeOrForm ?? null, brief: project.brief ?? null,
    status: project.status ?? "planning", current_stage_id: project.currentStageId ?? "problem", due_date: project.dueDate ?? null,
    stages: project.stages ?? [], created_at: project.createdAt, updated_at: project.updatedAt,
  };
}

function evidenceRow(evidence: Record<string, unknown>, userId: string) {
  return {
    id: evidence.id, project_id: evidence.projectId, user_id: userId, stage_id: evidence.stageId, type: evidence.type,
    title: evidence.title, content: evidence.content, source: evidence.source ?? "learner", created_at: evidence.createdAt,
  };
}

export async function syncProjectMutations(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, failed: 0 };
  const mutations = (await mutationQueue.listReady(user.id)).filter((item) => item.store === "projects" || item.store === "project_evidence");
  let synced = 0; let failed = 0;
  for (const mutation of mutations) {
    try {
      if (mutation.store === "projects") {
        if (mutation.operation === "delete") {
          const id = (mutation.payload as { id?: string }).id;
          if (!id) throw new Error("Project delete mutation is missing an id");
          const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("projects").upsert(projectRow(mutation.payload as Record<string, unknown>, user.id), { onConflict: "id" });
          if (error) throw error;
        }
      } else if (mutation.operation !== "delete") {
        const { error } = await supabase.from("project_evidence").upsert(evidenceRow(mutation.payload as Record<string, unknown>, user.id), { onConflict: "id" });
        if (error) throw error;
      }
      await mutationQueue.remove(mutation.id, user.id); synced++;
    } catch (error) {
      await mutationQueue.recordFailure(mutation.id, user.id, error); failed++;
    }
  }
  return { synced, failed };
}
