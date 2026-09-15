import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWhatsAppLinkCode } from "@/lib/platform/channel-link-codes";
import type { ClientRole } from "@/lib/channels/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_PRIORITY: ClientRole[] = [
  "student",
  "teacher",
  "parent",
  "school_admin",
  "tutor",
];
const ALLOWED_ROLES = new Set<ClientRole>(ROLE_PRIORITY);

function resolveLinkRole(rows: Array<{ role: string }>): ClientRole | null {
  const roles = new Set(rows.map((row) => row.role));
  return ROLE_PRIORITY.find((role) => roles.has(role)) ?? null;
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const roleResult = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleResult.error) {
    return NextResponse.json({ error: "Unable to resolve account role." }, { status: 500 });
  }

  const role = resolveLinkRole((roleResult.data ?? []) as Array<{ role: string }>);
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "This account cannot link WhatsApp yet." }, { status: 403 });
  }

  const result = await createWhatsAppLinkCode({ userId: user.id, role });
  return NextResponse.json(result, { status: 200 });
}
