import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuthContext = { supabase: SupabaseClient; user: User };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate(req: Request): Promise<AuthContext | null> {
  const admin = adminClient();
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const { data: { user }, error } = await admin.auth.getUser(bearer.slice(7).trim());
    if (!error && user) return { supabase: admin, user };
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const cookieStore = await cookies();
    const client = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: values => { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    });
    const { data: { user }, error } = await client.auth.getUser();
    return error || !user ? null : { supabase: admin, user };
  } catch { return null; }
}

export async function DELETE(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId } = await context.params;
    if (!sessionId || sessionId.length > 80) return NextResponse.json({ error: "Invalid session." }, { status: 400 });

    const { data: session } = await auth.supabase.from("paper_learning_sessions").select("id").eq("id", sessionId).eq("user_id", auth.user.id).maybeSingle();
    if (!session) return NextResponse.json({ error: "Learning session not found." }, { status: 404 });

    const { error } = await auth.supabase.from("paper_learning_sessions").delete().eq("id", sessionId).eq("user_id", auth.user.id);
    if (error) return NextResponse.json({ error: "Couldn't delete this paper session." }, { status: 500 });
    return NextResponse.json({ deleted: true, id: sessionId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't delete this paper session." }, { status: 500 });
  }
}
