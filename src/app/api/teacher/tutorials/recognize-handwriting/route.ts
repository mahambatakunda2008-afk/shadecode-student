import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { executeCortexText } from "@/lib/cortex/runtime/execution";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { normalizeHandwritingRecognition, parseHandwritingRecognition, validateHandwritingImageData } from "@/lib/teacher/handwriting";

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
  const mode = body?.mode === "mathematics" || body?.mode === "science" ? body.mode : "general";
  const imageValidation = validateHandwritingImageData(image, mimeType);
  if (!imageValidation.valid) {
    return NextResponse.json({ error: imageValidation.error }, { status: 400 });
  }

  const modeInstructions = mode === "mathematics"
    ? "MATHEMATICS MODE: Treat every equation as exact symbolic data, not prose. Preserve minus (−) versus dash, decimal point versus multiplication dot, 1/l/I, 0/O, x/×, +/t, =/≠, </≤, >/≥, brackets, fraction bars, roots, Greek letters, vector arrows, absolute-value bars, factorials, indices and powers. Use unambiguous Unicode or LaTeX notation for readable equations. Never infer a missing sign, digit, exponent, denominator or variable from what would make an equation mathematically valid. Mark uncertain symbols [unclear] and list candidates."
    : mode === "science"
      ? "SCIENCE MODE: Preserve chemical element symbols and capitalization, formula subscripts, ionic charges, reaction arrows, state symbols, units, significant figures, scientific notation, Greek symbols, labelled apparatus and biological terminology. Do not normalize a formula or value to what is scientifically expected if the handwriting says otherwise. Mark uncertain characters [unclear]."
      : "GENERAL MODE: Prioritize faithful handwritten words, letters, numbers, punctuation and layout. Use context to resolve obvious character confusions, but do not rewrite the author's meaning.";
  const prompt = `You are Shadecode Student's handwriting transcription and character-recovery engine.
${modeInstructions}
Read ALL handwritten text in this image, including isolated letters, numbers, labels, subscripts, superscripts, punctuation, mathematical notation and scientific symbols.
This is OCR plus contextual character correction, not a summary.
Return ONLY valid JSON with this exact shape:
{"transcript":"literal best-effort transcription","correctedText":"clean corrected transcription","confidence":0.0,"uncertainCharacters":[{"seen":"ambiguous mark","chosen":"best candidate or [unclear]","alternatives":["candidate 1","candidate 2"],"context":"short surrounding context","reason":"why ambiguous"}],"mathExpressions":[{"sourceText":"visible equation as written","latex":"x^2 + 3x = 0","confidence":0.0,"uncertainTokens":["uncertain sign or symbol"]}]}
Rules:
- Distinguish visually similar characters using both their shapes and the surrounding word, sentence, equation or subject context. Pay special attention to 0/O, 1/l/I, 2/Z, 5/S, 6/G, 8/B, rn/m, cl/d, u/v, +/t, ×/x, −/dash, decimal points, commas, brackets and superscript/subscript positions.
- Correct obvious misspellings and malformed words only when the intended characters are supported by the image and context. Do not invent missing content. In mathematics and science modes, never apply grammar or spelling correction to symbolic expressions, identifiers, formulae or numeric values.
- Preserve line breaks, lists, equations, units, variable names, chemical formulae, mathematical operators and technical vocabulary.
- Keep transcript as close to the visible writing as possible. correctedText may repair clear character confusions, spelling and punctuation, but must preserve meaning.
- If a character or word cannot be determined reliably, put [unclear] in correctedText and explain the candidates in uncertainCharacters. Never silently guess a critical number, formula, sign, unit or variable.
- In mathematics mode, extract every complete visible mathematical expression separately into mathExpressions with literal sourceText and faithful LaTeX. Never use algebraic validity to repair a symbol. Flag uncertain signs/tokens and lower confidence. In other modes return an empty mathExpressions array unless a clear equation is visible.
- If there is no legible writing, return empty transcript and correctedText, confidence 0, and empty uncertainCharacters and mathExpressions arrays.
- confidence is a number from 0 to 1 representing overall transcription confidence.
- uncertainCharacters must contain only genuinely uncertain readings, not ordinary corrected spelling.
- Return no markdown and no prose outside the JSON.`;

  const output = await executeCortexText(prompt, 1800, {
    operation: "teacher.handwriting.recognition",
    userId: reviewer.user.id,
    feature: "cortex",
    subfeature: "teacher_handwriting_ocr",
    media: [{ mimeType, data: image }],
    jsonResponse: true,
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
