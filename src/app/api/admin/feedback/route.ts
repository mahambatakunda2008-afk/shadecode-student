import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Standard admin auth (has_role RBAC), same as every other admin route --
// this replaces the old ADMIN_SECRET-bearer-token mechanism in
// /api/feedback, which had no UI calling it and required a secret only
// reachable via raw API calls. That's why feedback looked "broken": it
// was actually being submitted fine (6 rows already existed), there was
// just no way to see it in the app.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasUserRole(user.id, "admin"))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}
