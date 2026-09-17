import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserChannelIdentity, unlinkUserChannelIdentity } from "@/lib/platform/channel-identity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const identity = await resolveUserChannelIdentity("whatsapp", user.id);
  return NextResponse.json({
    connected: identity?.status === "active",
    status: identity?.status ?? "unlinked",
    linkedAt: identity?.linkedAt ?? null,
    phone: identity?.status === "active" ? identity.externalUserId : null,
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null,
  });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  await unlinkUserChannelIdentity("whatsapp", user.id);
  return NextResponse.json({ connected: false, status: "unlinked" });
}
