import { createClient } from "@/lib/supabase/client";

export async function generateRevision(content: string, topic: string) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw new Error("You must be signed in to generate revision content.");

  const res = await fetch("/api/generate-revision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ content, topic }),
  });

  if (!res.ok) throw new Error("Failed to generate revision");

  return res.json();
}
