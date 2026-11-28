import { mutationQueue } from "@/lib/offline/mutationQueue";
import { createClient } from "@/lib/supabase/client";
import type { StudentProject } from "./types";

async function currentOwnerId(): Promise<string | null> {
  try {
    // Read the locally persisted session. getUser() performs a server validation
    // request and can fail precisely when this queue must accept offline work.
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function queueProjectUpsert(project: StudentProject): Promise<void> {
  const ownerId = await currentOwnerId();
  if (!ownerId) return;
  await mutationQueue.enqueue({ ownerId, operation: "create", store: "projects", payload: { ...project, user_id: ownerId } });
  for (const evidence of project.evidence) {
    await mutationQueue.enqueue({
      ownerId,
      operation: "create",
      store: "project_evidence",
      payload: { ...evidence, projectId: project.id, user_id: ownerId },
    });
  }
}

export async function queueProjectDelete(projectId: string): Promise<void> {
  const ownerId = await currentOwnerId();
  if (!ownerId) return;
  await mutationQueue.enqueue({ ownerId, operation: "delete", store: "projects", payload: { id: projectId, user_id: ownerId } });
}
