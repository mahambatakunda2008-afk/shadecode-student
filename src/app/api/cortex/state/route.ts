// /app/api/cortex/state/route.ts

import { NextResponse } from "next/server";
import { cortexAnalyze } from "@/lib/cortex/engine";

export const dynamic = "force-dynamic";

export async function POST(req: any) {
  const state = await req.json();

  const analysis = cortexAnalyze(state);

  return NextResponse.json({
    message: analysis.message,
    difficulty: analysis.difficulty,
    mode: analysis.mode,
  });
}
