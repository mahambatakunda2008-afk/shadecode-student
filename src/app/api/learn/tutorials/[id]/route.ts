import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { matchAllowedSubject } from "@/lib/academic/subjectContract";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid tutorial." }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to open tutorials." }, { status: 401 });

    const { data, error } = await supabase
      .from("teacher_tutorials")
      .select("id,title,subject,topic,summary,blocks,version,published_at")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Tutorial not found." }, { status: 404 });

    const access = await resolveLearnerSubject(supabase, user.id, data.subject);
    if (!access.ok || matchAllowedSubject(data.subject, [access.subject]) !== access.subject) {
      return NextResponse.json({ error: access.ok ? "This tutorial is not available for your subjects." : access.error }, { status: access.ok ? 403 : access.status });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Tutorial media is temporarily unavailable." }, { status: 503 });
    const blocks = await Promise.all((Array.isArray(data.blocks) ? data.blocks : []).map(async (raw: Record<string, unknown>) => {
      const block = { ...raw };
      const path = typeof block.storagePath === "string" ? block.storagePath : "";
      if (path && ["image", "diagram", "sketch", "audio"].includes(String(block.type))) {
        const { data: signed, error: signError } = await admin.storage.from("teacher-media").createSignedUrl(path, 900);
        if (signError || !signed?.signedUrl) return { ...block, mediaUrl: null };
        return { ...block, mediaUrl: signed.signedUrl };
      }
      return block;
    }));

    return NextResponse.json({ tutorial: { ...data, blocks } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[learn/tutorials/id]", error);
    return NextResponse.json({ error: "Tutorial could not be loaded.", retryable: true }, { status: 503 });
  }
}
