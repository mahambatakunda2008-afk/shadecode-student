import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vision + reasoning calls on multi-step problems (calculus, matrices,
// mechanics) routinely exceed the default 10s serverless timeout. Without
// this the function is killed mid-call and the client sees a generic
// network failure with no logged reason.
export const maxDuration = 60;

// Vercel serverless functions cap request bodies around 4.5MB. Camera
// photos from modern phones regularly exceed that, so formData() throws
// before we ever reach the provider. Fail fast with a clear reason instead
// of letting that surface as an opaque 500.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Same key-rotation + model-fallback pattern the rest of the app uses via
// src/lib/ai.ts ("SINGLE source of truth for calling the AI provider
// fallback chain"). The image route was never wired into that chain, so it
// had a single point of failure: one provider, one key, one model.
//
// Confirmed in prod (Vercel runtime errors, 2026-07-22): the primary
// GEMINI_API_KEY has `limit: 0` on the free tier for gemini-2.0-flash --
// a structural zero-quota account issue, not a transient rate limit.
// OpenAI is tried first for that reason.
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const SYSTEM_PROMPT = `You are Cortex, an expert math and science tutor reading a photo of a student's handwritten or printed working.

Read the image carefully. It may contain: algebra, simultaneous equations, fractions, calculus, vectors, matrices, mechanics, or other physics formulas. Handwriting may be messy — read what is actually on the page, do not guess or invent a "cleaner" version of the problem.

If the image is too blurry, too dark, cropped, or otherwise unreadable to transcribe with confidence, do NOT attempt to solve it. Instead return low confidence and ask the student to retake the photo.

Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "confidence": 0.0 to 1.0 (how sure you are you read the image correctly),
  "needsRetake": true or false (true if confidence is too low to grade fairly, roughly below 0.5),
  "retakeReason": "short reason if needsRetake is true, otherwise empty string",
  "problem": "the question, transcribed or inferred from the working",
  "score": 0 to 100,
  "correct": true or false,
  "cortexInsight": "2-3 sentences of specific feedback on this student's actual working",
  "steps": [
    {
      "description": "what the student did in this step",
      "status": "correct" or "incorrect" or "partial",
      "note": "short explanation, only if status is not correct"
    }
  ]
}

Formatting rules for values inside the JSON strings:
- Do not use LaTeX commands (no \\frac, \\int, \\begin{matrix}, etc.) and do not use raw backslashes at all.
- Write math in plain text/unicode instead: x^2, sqrt(x), (a/b), integral of, matrix rows separated by " | ".
- Every string value must be valid JSON — no literal newlines or unescaped quotes inside a string.`;

function buildUserPrompt(topic, question) {
  let prompt = `Subject/topic: ${topic}.`;
  if (question && question.trim()) {
    prompt += ` The student says the question is: "${question.trim()}". Use this to confirm what you read, but trust the image over this text if they conflict.`;
  } else {
    prompt += ` No question text was provided — infer the question from the working shown.`;
  }
  return prompt;
}

function extractJson(text) {
  // With JSON mode enabled the provider should return raw JSON directly,
  // but keep a defensive fallback in case a model wraps it in markdown
  // fences anyway.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate);
}

function isValidResult(json) {
  return (
    json &&
    typeof json.score === 'number' &&
    typeof json.correct === 'boolean' &&
    typeof json.cortexInsight === 'string' &&
    Array.isArray(json.steps)
  );
}

/** Build the ordered list of (provider, model) attempts to try, each returning raw response text. */
function buildAttempts({ base64, mimeType, userPrompt }) {
  const attempts = [];

  // 1. OpenAI gpt-4o-mini -- vision-capable, JSON mode, most reliable
  // structured output per lib/ai.ts's existing rationale for this model.
  if (process.env.OPENAI_API_KEY) {
    attempts.push({
      provider: 'openai',
      model: 'gpt-4o-mini',
      run: async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: `${SYSTEM_PROMPT}\n\n${userPrompt}` },
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                ],
              },
            ],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
        }
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenAI returned empty content');
        return text;
      },
    });
  }

  // 2. Gemini -- all configured keys x both models, same rotation lib/ai.ts uses.
  for (const key of GEMINI_KEYS) {
    const genAI = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      attempts.push({
        provider: 'gemini',
        model: modelName,
        run: async () => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 3000,
            },
          });
          const result = await model.generateContent([
            SYSTEM_PROMPT,
            userPrompt,
            { inlineData: { mimeType, data: base64 } },
          ]);
          return result.response.text();
        },
      });
    }
  }

  return attempts;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');
    // Previously only "topic" was read here — "question" was appended by
    // the frontend on every request and silently dropped, so any question
    // text the student typed never reached the model.
    const topic = formData.get('subject') || formData.get('topic') || 'General Math';
    const question = formData.get('question') || '';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image' }, { status: 400 });
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'That photo is too large. Try a smaller image or lower camera resolution.' },
        { status: 413 }
      );
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const userPrompt = buildUserPrompt(topic, question);
    const attempts = buildAttempts({ base64, mimeType: imageFile.type, userPrompt });

    if (attempts.length === 0) {
      console.error('[math-checker] No AI provider configured (OPENAI_API_KEY / GEMINI_API_KEY missing)');
      return NextResponse.json({ error: 'Math checker is temporarily unavailable.' }, { status: 503 });
    }

    let lastErrorReason = 'unavailable';

    for (const attempt of attempts) {
      const label = `${attempt.provider}/${attempt.model}`;
      try {
        const text = await attempt.run();

        let json;
        try {
          json = extractJson(text);
        } catch (parseErr) {
          console.error(`[math-checker] JSON.parse failed (${label}):`, parseErr, text.slice(0, 300));
          lastErrorReason = 'unparseable';
          continue; // try next provider/model rather than failing the whole request
        }

        if (json.needsRetake) {
          return NextResponse.json(
            {
              needsRetake: true,
              error: json.retakeReason || "Couldn't read that clearly enough to grade fairly. Please retake the photo with better lighting and focus.",
            },
            { status: 422 }
          );
        }

        if (!isValidResult(json)) {
          console.error(`[math-checker] Model returned incomplete shape (${label}):`, JSON.stringify(json).slice(0, 300));
          lastErrorReason = 'incomplete';
          continue;
        }

        return NextResponse.json(json);
      } catch (err) {
        console.error(`[math-checker] ${label} failed:`, err instanceof Error ? err.message : err);
        lastErrorReason = 'provider_error';
      }
    }

    // Every provider/key/model combination failed or returned unusable output.
    const messages = {
      unparseable: 'Could not read that image clearly. Try a clearer photo.',
      incomplete: 'Analysis was incomplete. Please try again.',
      provider_error: 'Math checker is temporarily unavailable. Please try again shortly.',
      unavailable: 'Math checker is temporarily unavailable.',
    };
    return NextResponse.json({ error: messages[lastErrorReason] }, { status: 502 });
  } catch (err) {
    console.error('[math-checker] Analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
