import { CortexCore } from "@/lib/cortex/core";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { userId, type, payload } = body;

    if (!userId || !type) {
      return Response.json(
        { error: "Missing userId or type" },
        { status: 400 }
      );
    }

    const result = await CortexCore({
      userId,
      type,
      payload,
    });

    return Response.json(result);
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Cortex failure" },
      { status: 500 }
    );
  }
}