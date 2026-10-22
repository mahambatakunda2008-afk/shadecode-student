import LibraryHub from "@/components/study/LibraryHub";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";

export const metadata = { title: "Lesson library | Shadecode Student" };

export default async function LibraryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return <main className="mx-auto w-full max-w-2xl px-4 py-8"><h1 className="text-2xl font-semibold">Lesson library</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Sign in to search lessons for your selected subjects.</p></main>;

  try {
    const learner = await resolveLearnerSubjects(supabase, user.id);
    return <LibraryHub subjects={learner.subjects} />;
  } catch {
    return <main className="mx-auto w-full max-w-2xl px-4 py-8"><h1 className="text-2xl font-semibold">Lesson library unavailable</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">We could not load your selected subjects. Please try again.</p></main>;
  }
}
