import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";
import UploadForm from "./UploadForm";

export default async function AdminExamHubUploadPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await hasUserRole(user.id, "admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { data: syllabi } = await supabase.from("syllabi").select("id, subject, board, levels").order("board").order("subject");

  return <UploadForm syllabi={syllabi ?? []} />;
}
