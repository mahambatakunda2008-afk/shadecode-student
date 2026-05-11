// /app/api/cortex/event/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { event, session } = await req.json();

  // In real system: update DB + session state
  const updated = { ...session };

  if (event === "task_completed") {
    updated.focusScore += 5;
  }

  if (event === "idle") {
    updated.focusScore -= 10;
  }

  return NextResponse.json({ session: updated });
}
