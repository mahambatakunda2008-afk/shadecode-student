import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { executeCortexText } from "@/lib/cortex/runtime/execution";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { normalizeHandwritingRecognition, parseHandwritingRecognition } from "@/lib/teacher/handwriting";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(request: Request) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const mimeType = body?.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
  if (!image || image.length > 4_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return NextResponse.json({ error: "Provide a valid canvas image under 3 MiB." }, { status: 400 });
  }

  const prompt = `You are Shadecode Student's handwriting transcription and character-recovery engine.
Read ALL handwritten text in this image, including isolated letters, numbers, labels, subscripts, superscripts, punctuation, mathematical notation and scientific symbols.
This is OCR plus contextual character correction, not a summary.
Return ONLY valid JSON with this exact shape:
{"transcript":"literal best-effort transcription","correctedText":"clean corrected transcription","confidence":0.0,"uncertainCharacters":[{"seen":"ambiguous mark","chosen":"best candidate or [unclear]","alternatives":["candidate 1","candidate 2"],"context":"short surrounding context","reason":"why ambiguous"}]}
Rules:
- Distinguish visually similar characters using both their shapes and the surrounding word, sentence, equation or subject context. Pay special attention to 0/O, 1/l/I, 2/Z, 5/S, 6/G, 8/B, rn/m, cl/d, u/v, +/t, ×/x, −/dash, decimal points, commas, brackets and superscript/subscript positions.
- Correct obvious misspellings and malformed words only when the intended characters are supported by the image and context. Do not invent missing content.
- Preserve line breaks, lists, equations, units, variable names, chemical formulae, mathematical operators and technical vocabulary.
- Keep transcript as close to the visible writing as possible. correctedText may repair clear character confusions, spelling and punctuation, but must preserve meaning.
- If a character or word cannot be determined reliably, put [unclear] in correctedText and explain the candidates in uncertainCharacters. Never silently guess a critical number, formula, sign, unit or variable.
- If there is no legible writing, return empty transcript and correctedText, confidence 0, and an empty uncertainCharacters array.
- confidence is a number from 0 to 1 representing overall transcription confidence.
- uncertainCharacters must contain only genuinely uncertain readings, not ordinary corrected spelling.
- Return no markdown and no prose outside the JSON.`;

  const output = await executeCortexText(prompt, 1800, {
    operation: "teacher.handwriting.recognition",
    userId: reviewer.user.id,
    feature: "cortex",
    subfeature: "teacher_handwriting_ocr",
    media: [{ mimeType, data: image }],
    maxChainMs: 42000,
    perProviderMaxMs: 9000,
    skipCurriculumGrounding: true,
  });

  if (!output?.trim()) {
    return NextResponse.json({ error: "Handwriting recognition is temporarily unavailable. Your canvas has not been changed." }, { status: 503 });
  }

  const parsed = parseHandwritingRecognition(output);
  if (!parsed) {
    return NextResponse.json({ error: "The handwriting service returned an unreadable result. Please try again." }, { status: 502 });
  }

  const normalized = normalizeHandwritingRecognition(parsed);
  if (!normalized.transcript && !normalized.correctedText) {
    return NextResponse.json({ error: "No readable handwriting was found. Try darker, larger writing with more spacing." }, { status: 422 });
  }

  return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
}
