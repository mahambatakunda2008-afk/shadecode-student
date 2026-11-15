import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { TeacherAccountMenu } from "./TeacherAccountMenu";
import { TeacherNav } from "./TeacherNav";

export const dynamic = "force-dynamic";

/** Own shell for teachers: no student sidebar, no admin tools. Signed-in non-teachers go home. */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const reviewer = await getTeacherWorkspace();
  if (!reviewer) redirect("/");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/teacher" aria-label="Teacher portal home"><BrandLockup compact /></Link>
          <TeacherAccountMenu isAdmin={reviewer.isAdmin} />
        </div>
        <TeacherNav isAdmin={reviewer.isAdmin} canReviewContent={reviewer.canReviewContent} canAuthorTutorials={reviewer.canAuthorTutorials} isInstitutionStaff={reviewer.isInstitutionStaff} />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:py-9">{children}</main>
    </div>
  );
}
