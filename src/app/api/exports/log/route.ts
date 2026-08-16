import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_FORMATS = new Set(["json", "csv", "txt", "pdf"]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await request.json();
    const format = typeof body?.format === "string" ? body.format.toLowerCase() : "";
    const exportType = typeof body?.exportType === "string" ? body.exportType.slice(0, 80) : "generic";
    const sourceType = typeof body?.sourceType === "string" ? body.sourceType.slice(0, 80) : null;
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId.slice(0, 120) : null;
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
    }

    const { error } = await supabase.from("export_logs").insert({
      user_id: user.id,
      export_type: exportType,
      source_type: sourceType,
      source_id: sourceId,
      format,
      metadata,
    });

    if (error) return NextResponse.json({ error: "Unable to log export" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
