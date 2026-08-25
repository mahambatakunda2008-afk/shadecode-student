import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;
  if (!appId || !appKey) {
    return NextResponse.json({ available: false, error: "Handwriting recognition is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { strokes?: unknown } | null;
  if (!body?.strokes) return NextResponse.json({ error: "Stroke data is required." }, { status: 400 });

  const response = await fetch("https://api.mathpix.com/v3/strokes", {
    method: "POST",
    headers: { "Content-Type": "application/json", app_id: appId, app_key: appKey },
    body: JSON.stringify({
      strokes: body.strokes,
      formats: ["text", "data"],
      data_options: { include_latex: true, include_asciimath: true },
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);

  if (!response) return NextResponse.json({ error: "Recognition service unavailable." }, { status: 503 });
  const result = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: result?.error ?? "Recognition failed." }, { status: response.status });

  return NextResponse.json({
    available: true,
    text: result?.text ?? "",
    latex: result?.latex_styled ?? result?.data?.find?.((item: { type?: string }) => item.type === "latex")?.value ?? "",
    confidence: typeof result?.confidence === "number" ? result.confidence : null,
    handwritten: result?.is_handwritten ?? null,
    autoRotateDegrees: result?.auto_rotate_degrees ?? 0,
  });
}
