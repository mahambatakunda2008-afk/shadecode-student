import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function pickVariant(key: string, userId: string, variants: unknown): string | null {
  if (!Array.isArray(variants)) return null;
  const names = variants
    .map((variant) => typeof variant === "string" ? variant : typeof variant?.name === "string" ? variant.name : null)
    .filter((name): name is string => Boolean(name));
  if (!names.length) return null;
  const digest = createHash("sha256").update(`${key}:${userId}`).digest();
  const bucket = digest.readUInt32BE(0) / 0xffffffff;
  return names[Math.min(names.length - 1, Math.floor(bucket * names.length))];
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(key)) return NextResponse.json({ error: "Invalid experiment key" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ experiment: null });

  const { data: experiment } = await supabase
    .from("experiments")
    .select("id,key,name,variants,active")
    .eq("key", key)
    .eq("active", true)
    .maybeSingle();

  if (!experiment) return NextResponse.json({ experiment: null });

  const { data: existing } = await supabase
    .from("experiment_assignments")
    .select("variant")
    .eq("experiment_id", experiment.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.variant) return NextResponse.json({ experiment: { key: experiment.key, variant: existing.variant } });

  const variant = pickVariant(experiment.key, user.id, experiment.variants);
  if (!variant) return NextResponse.json({ experiment: null });

  const { error } = await supabase.from("experiment_assignments").insert({
    experiment_id: experiment.id,
    user_id: user.id,
    variant,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: "Unable to assign experiment" }, { status: 500 });
  }

  return NextResponse.json({ experiment: { key: experiment.key, variant } });
}
