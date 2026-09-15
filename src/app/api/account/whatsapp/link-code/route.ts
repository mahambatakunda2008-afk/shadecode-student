import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWhatsAppLinkCode } from "@/lib/platform/channel-link-codes";
import type { ClientRole } from "@/lib/channels/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set<ClientRole>(["student", "teacher", "parent", "school_admin", "tutor"]);

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const roleResult = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (roleResult.error) {
    return NextResponse.json({ error: "Unable to resolve account role." }, { status: 500 });
  }

  const role = roleResult.data?.role as ClientRole | undefined;
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "This account cannot link WhatsApp yet." }, { status: 403 });
  }

  const result = await createWhatsAppLinkCode({ userId: user.id, role });
  return NextResponse.json(result, { status: 200 });
}
