import { createClient } from "@supabase/supabase-js";
import { bearerToken, secretsMatch } from "@/lib/auth/secret-compare";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Fails closed: if ADMIN_SECRET is unset this never matches (previously the
    // expected value became the literal "Bearer undefined"). Constant-time compare.
    const presented = bearerToken(req.headers.get("authorization"));

    if (!secretsMatch(presented, process.env.ADMIN_SECRET)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
