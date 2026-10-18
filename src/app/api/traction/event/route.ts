import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAME_RE = /^[a-zA-Z0-9_.:-]{1,100}$/;
const CLIENT_EVENT_ID_RE = /^[a-zA-Z0-9_-]{1,120}$/;
/** Events come from the browser, so cap payload size on this unauthenticated endpoint. */
const MAX_PROPERTIES_CHARS = 4000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!NAME_RE.test(name)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    const clientEventId = typeof body?.clientEventId === "string" ? body.clientEventId.trim() : "";
    if (!CLIENT_EVENT_ID_RE.test(clientEventId)) {
      return NextResponse.json({ error: "Invalid client event id" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rawProperties = body?.properties && typeof body.properties === "object" && !Array.isArray(body.properties)
      ? body.properties
      : {};
    const properties = JSON.stringify(rawProperties).length <= MAX_PROPERTIES_CHARS
      ? rawProperties
      : { properties_dropped: true };

    // Logged-out visitors (landing and signup funnel) have no insert policy by design, so their
    // events are written server-side after the validation above. Signed-in users keep using RLS.
    const writer = user ? supabase : (createSupabaseAdminClient() ?? supabase);

    const { error } = await writer.from("traction_events").insert({
      client_event_id: clientEventId,
      user_id: user?.id ?? null,
      anonymous_id: typeof body?.anonymousId === "string" ? body.anonymousId.slice(0, 120) : null,
      session_id: typeof body?.sessionId === "string" ? body.sessionId.slice(0, 120) : null,
      name,
      path: typeof body?.path === "string" ? body.path.slice(0, 500) : null,
      properties,
    });

    if (error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    if (error) return NextResponse.json({ error: "Unable to record event" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
