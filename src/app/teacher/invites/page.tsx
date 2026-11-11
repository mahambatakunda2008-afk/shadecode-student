import { redirect } from "next/navigation";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { InvitesClient, type InviteRow } from "./InvitesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher invites · Shadecode Student" };

export default async function TeacherInvitesPage() {
  const reviewer = (await getReviewer())!;
  if (!reviewer.isAdmin) redirect("/teacher");

  const { data } = await reviewer.supabase
    .from("teacher_invites")
    .select("id,note,created_at,expires_at,used_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return <InvitesClient initial={(data ?? []) as InviteRow[]} />;
}
