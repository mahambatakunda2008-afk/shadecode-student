import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";
import HubContent from "./HubContent";

export default async function ExamHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin = user ? await hasUserRole(user.id, "admin") : false;

  return <HubContent isAdmin={isAdmin} />;
}
