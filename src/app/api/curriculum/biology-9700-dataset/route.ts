import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(process.cwd(), "public", "generated", "cambridge-9700-2025-2027.json");
  try {
    const body = await fs.readFile(file, "utf8");
    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Biology 9700 dataset was not generated during this build." }, { status: 404 });
  }
}
