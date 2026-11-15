import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const institutionType = typeof body?.institutionType === "string" ? body.institutionType : "school";
  const countryCode = typeof body?.countryCode === "string" ? body.countryCode.trim().toUpperCase() : null;
  if (name.length < 2 || name.length > 160) {
    return NextResponse.json({ error: "Institution name must be 2 to 160 characters." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_platform_institution", {
    p_name: name,
    p_institution_type: institutionType,
    p_country_code: countryCode,
  });
  if (error) return NextResponse.json({ error: "You are not authorized to bootstrap an institution, or the details are invalid." }, { status: 403 });
  return NextResponse.json({ institutionId: data }, { status: 201 });
}
