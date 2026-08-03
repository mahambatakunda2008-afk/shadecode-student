import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Reuse many patterns from math-checker route: provider rotation, vision-first
export const maxDuration = 60;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_TOKENS: string[] = [process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_API_2].filter(Boolean) as string[];
const CF_VISION_URL = CF_ACCOUNT ? `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct` : '';

async function agreeToVisionLicense(token: string) {
  try {
    await fetch(CF_VISION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'agree' }),
    });
  } catch {
    // ignore
  }
}

function isLicenseError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('5016') || /agree|license|terms/i.test(msg);
}

const GEMINI_KEYS: string[] = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const SYSTEM_PROMPT_CHECK = `You are Cortex Verify, an academic verifier and feedback agent. When given a photo of student working, return ONLY valid JSON matching this shape:\n{\n  "confidence": 0.0 to 1.0,\n  "needsRetake": true/false,\n  "retakeReason": "",\n  "problem": "transcribed question",\n  "score": 0-100,\n  "correct": true/false,\n  "cortexInsight": "short feedback",\n  "steps": [{ "description": "step", "status": "correct|incorrect|partial", "note": "optional" }],\n  "marksBreakdown": [{ "criterion": "reason", "marksLost": 1, "note": "optional" }]\n}`;

function buildUserPrompt(topic: string, question?: string) {
  let prompt = `Subject/topic: ${topic}.`;
  if (question && question.trim()) {
    prompt += ` The student says the question is: "${question.trim()}".`;
  } else {
    prompt += ` No question text provided — infer from image.`;
  }
  return prompt;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate);
}

function isValidCheckResult(json: any) {
  return json && typeof json.score === 'number' && typeof json.correct === 'boolean' && typeof json.cortexInsight === 'string' && Array.isArray(json.steps);
}

function buildVisionAttempts({ base64, mimeType, userPrompt }: { base64: string; mimeType: string; userPrompt: string; }) {
  const attempts = [];
  for (const token of CLOUDFLARE_TOKENS) {
    attempts.push({
      provider: 'cloudflare',
      model: 'llama-3.2-11b-vision-instruct',
      run: async () => {
        const callVision = async () => {
          const res = await fetch(CF_VISION_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM_PROMPT_CHECK }, { role: 'user', content: userPrompt }], image: `data:${mimeType};base64,${base64}`, max_tokens: 4000 }),
          });
          const data = await res.json();
          if (!data?.success) throw new Error(JSON.stringify(data?.errors || data).slice(0, 300));
          const text = typeof data.result === 'string' ? data.result : data.result?.response ?? data.result?.description;
          if (!text) throw new Error('Cloudflare returned empty content');
          return text;
        };
        try {
          return await callVision();
        } catch (err) {
          if (!isLicenseError(err)) throw err;
          await agreeToVisionLicense(token);
          return await callVision();
        }
      },
    });
  }

  for (const key of GEMINI_KEYS) {
    const genAI = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      attempts.push({ provider: 'gemini', model: modelName, run: async () => {
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 6000 } });
        const result = await model.generateContent([SYSTEM_PROMPT_CHECK, userPrompt, { inlineData: { mimeType, data: base64 } }]);
        return result.response.text();
      } });
    }
  }

  if (process.env.OPENAI_API_KEY) {
    attempts.push({ provider: 'openai', model: 'gpt-4o-mini', run: async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', response_format: { type: 'json_object' }, max_tokens: 6000, messages: [{ role: 'user', content: `${SYSTEM_PROMPT_CHECK}\n\n${userPrompt}` },], }), });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI returned empty content');
      return text;
    } });
  }

  return attempts;
}

function buildTextAttempts({ userPrompt, targetShape = 'help' }: { userPrompt: string; targetShape?: string }) {
  const attempts = [];
  for (const key of GEMINI_KEYS) {
    const genAI = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      attempts.push({ provider: 'gemini', model: modelName, run: async () => {
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'text', maxOutputTokens: 2000 } });
        const result = await model.generateContent([userPrompt]);
        return result.response.text();
      } });
    }
  }

  if (process.env.OPENAI_API_KEY) {
    attempts.push({ provider: 'openai', model: 'gpt-4o-mini', run: async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 2000, messages: [{ role: 'user', content: userPrompt }] }), });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
      return data.choices?.[0]?.message?.content || '';
    } });
  }

  return attempts;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const mode = (formData.get('mode') || 'check') as string;
    const subject = String(formData.get('subject') || formData.get('topic') || 'General');
    const question = String(formData.get('question') || '');

    if (mode === 'check') {
      const imageFile = formData.get('image') as File | null;
      if (!imageFile) return NextResponse.json({ error: 'No image provided for check mode' }, { status: 400 });
      if (imageFile.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'That photo is too large. Try a smaller image.' }, { status: 413 });

      const bytes = await imageFile.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const userPrompt = buildUserPrompt(subject, question);
      const attempts = buildVisionAttempts({ base64, mimeType: imageFile.type, userPrompt });

      if (attempts.length === 0) return NextResponse.json({ error: 'Cortex Verify is temporarily unavailable.' }, { status: 503 });

      let lastError = 'unavailable';
      for (const attempt of attempts) {
        const label = `${attempt.provider}/${attempt.model}`;
        try {
          const text = await attempt.run();
          let json;
          try {
            json = extractJson(text);
          } catch (e) {
            lastError = 'unparseable';
            continue;
          }
          if (json.needsRetake) {
            return NextResponse.json({ needsRetake: true, error: json.retakeReason || "Couldn't read that clearly enough to grade fairly." }, { status: 422 });
          }
          if (!isValidCheckResult(json)) {
            lastError = 'incomplete';
            continue;
          }
          json._source = { provider: attempt.provider, model: attempt.model };
          return NextResponse.json(json);
        } catch (err) {
          lastError = 'provider_error';
        }
      }

      const messages: Record<string,string> = { unparseable: 'Could not parse analysis.', incomplete: 'Analysis incomplete.', provider_error: 'Cortex Verify is temporarily unavailable.', unavailable: 'Cortex Verify is temporarily unavailable.' };
      return NextResponse.json({ error: messages[lastError] || 'Cortex Verify is temporarily unavailable.' }, { status: 502 });
    }

    if (mode === 'help') {
      const level = String(formData.get('level') || 'hint');
      let userPrompt = `You are Cortex, an educational tutor. The student requests help for subject: ${subject}. The student provided question: "${question}". The help level requested is: ${level}.\n`;
      if (level === 'hint') {
        userPrompt += 'Provide a short hint or question that nudges the student without revealing the answer. Keep it concise (1-2 sentences). Return JSON: {"level":"hint","hint":"..."}';
      } else if (level === 'method') {
        userPrompt += 'Explain the method and steps the student should use to solve the problem. Do NOT provide the final numeric answer. Return JSON: {"level":"method","method":"...","steps":["step1","step2"]}';
      } else if (level === 'solution') {
        userPrompt += 'Provide a full worked solution with step-by-step reasoning and final answer. This mode is allowed because the student explicitly requested full solution. Return JSON: {"level":"solution","solution":"...","steps":[{"description":"","explanation":""}],"finalAnswer":"..."}';
      } else {
        return NextResponse.json({ error: 'Unknown help level' }, { status: 400 });
      }

      const attempts = buildTextAttempts({ userPrompt, targetShape: 'help' });
      if (attempts.length === 0) return NextResponse.json({ error: 'Cortex Help temporarily unavailable' }, { status: 503 });

      for (const attempt of attempts) {
        try {
          const text = await attempt.run();
          try {
            const parsed = extractJson(text);
            parsed._source = { provider: attempt.provider, model: attempt.model };
            return NextResponse.json(parsed);
          } catch (e) {
            const fallback = { level, content: text, _source: { provider: attempt.provider, model: attempt.model } };
            return NextResponse.json(fallback);
          }
        } catch (err) {
          continue;
        }
      }

      return NextResponse.json({ error: 'All providers failed' }, { status: 502 });
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (err) {
    console.error('[cortex/verify] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
