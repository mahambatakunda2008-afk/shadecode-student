import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAME_RE = /^[a-zA-Z0-9_.:-]{1,100}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!NAME_RE.test(name)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const properties = body?.properties && typeof body.properties === "object"
      ? body.properties
      : {};

    const { error } = await supabase.from("traction_events").insert({
      user_id: user?.id ?? null,
      anonymous_id: typeof body?.anonymousId === "string" ? body.anonymousId.slice(0, 120) : null,
      session_id: typeof body?.sessionId === "string" ? body.sessionId.slice(0, 120) : null,
      name,
      path: typeof body?.path === "string" ? body.path.slice(0, 500) : null,
      properties,
    });

    if (error) return NextResponse.json({ error: "Unable to record event" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
