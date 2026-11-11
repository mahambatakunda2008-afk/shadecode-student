import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join as a teacher · Shadecode Student" };

// proxy.ts sends signed-out visitors to login and brings them back here with the code intact.
export default async function JoinTeacherPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await getReviewer()) redirect("/teacher");
  const { code } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
        <BrandLockup compact />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Join as a teacher</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review lessons and questions so students can trust what they study.
          </p>
        </div>
        <JoinClient code={code ?? ""} />
      </div>
    </main>
  );
}
