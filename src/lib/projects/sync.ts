import { createClient } from "@/lib/supabase/client";
import { listProjectMutations, removeProjectMutation, recordProjectMutationFailure, type ProjectMutation } from "./syncQueue";

export async function syncProjectMutations(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, failed: 0 };
  const mutations = await listProjectMutations(user.id);
  let synced = 0; let failed = 0;
  for (const mutation of mutations) {
    try {
      const payload = mutation.project ? { ...mutation.project, user_id: user.id } : { id: mutation.projectId, user_id: user.id };
      if (mutation.operation === "delete") {
        const { error } = await supabase.from("student_projects").delete().eq("id", mutation.projectId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("student_projects").upsert(payload, { onConflict: "id" });
        if (error) throw error;
      }
      await removeProjectMutation(mutation.id, user.id);
      synced++;
    } catch (error) {
      await recordProjectMutationFailure(mutation.id, user.id, error);
      failed++;
    }
  }
  return { synced, failed };
}
