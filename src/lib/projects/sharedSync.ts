import { mutationQueue } from "@/lib/offline/mutationQueue";
import { createClient } from "@/lib/supabase/client";
import type { StudentProject } from "./types";

async function currentOwnerId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function queueProjectUpsert(project: StudentProject): Promise<void> {
  const ownerId = await currentOwnerId();
  if (!ownerId) return;
  await mutationQueue.enqueue({ ownerId, operation: "update", store: "projects", payload: project });
}

export async function queueProjectDelete(projectId: string): Promise<void> {
  const ownerId = await currentOwnerId();
  if (!ownerId) return;
  await mutationQueue.enqueue({ ownerId, operation: "delete", store: "projects", payload: { id: projectId } });
}
