import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { executeCortexText } from "@/lib/cortex/runtime/execution";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const mode = body?.mode === "label" ? "label" : "lesson";
  if (!text || text.length > 6000) {
    return NextResponse.json({ error: "Enter text between 1 and 6,000 characters." }, { status: 400 });
  }

  const prompt = `You are the editorial quality layer inside Shadecode Student's teacher authoring studio.
Improve the supplied ${mode === "label" ? "diagram label" : "teaching content"} so it is clear, correct, natural, and professionally written.
Correct spelling, grammar, punctuation, awkward phrasing, repetition, sentence flow, and obvious typos.
Preserve the author's exact meaning, intended level, tone, all factual claims, numbers, units, equations, symbols, variable names, code, citations, and subject-specific terminology.
Do not add facts, examples, claims, headings, or explanations that were not present. Do not simplify away important technical detail. If a phrase is ambiguous, make the smallest safe correction rather than guessing.
Return only the improved text, with no preamble, quotation marks, markdown fences, or commentary.
TEXT:
${text}`;

  const improved = await executeCortexText(prompt, 1100, {
    operation: "teacher.tutorial.text_improvement",
    userId: reviewer.user.id,
    feature: "cortex",
    subfeature: "tutorial_text_improvement",
  });

  if (!improved?.trim()) {
    return NextResponse.json({ error: "Text improvement is temporarily unavailable. Your original text is unchanged." }, { status: 503 });
  }

  const cleaned = improved.trim().replace(/^\`\`\`(?:text|markdown)?\s*/i, "").replace(/\s*\`\`\`$/, "");
  return NextResponse.json({ improvedText: cleaned, changed: cleaned !== text });
}
