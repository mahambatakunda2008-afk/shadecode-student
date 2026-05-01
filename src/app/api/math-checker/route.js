// src/app/api/math-checker/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // Try models in order
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let result = null;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are Cortex, a neutral mathematical analysis system inside Shadecode Student.

Analyse this student's handwritten or typed math working. Do not encourage or motivate — only observe and reflect what the working shows.

Respond ONLY with valid JSON in this exact format:
{
  "problem": "Brief description of the math problem being solved",
  "score": <number 0-100 representing correctness>,
  "correct": <true if fully correct, false otherwise>,
  "cortexInsight": "2-3 sentences. Neutral, analytical observation about the student's method and working. Do not say 'well done' or 'good job'. Simply describe what the working reveals about their understanding.",
  "steps": [
    {
      "description": "What this step does mathematically",
      "status": "correct | incorrect | warning",
      "note": "Optional short note about this step — what was right, wrong, or skipped"
    }
  ]
}

Analyse every visible step. If working is unclear or missing steps, note that in cortexInsight.`;

        const response = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ]);

        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        result = JSON.parse(jsonMatch[0]);
        break;
      } catch (err) {
        console.error(`Model ${modelName} failed:`, err.message);
        continue;
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Analysis failed — try again' }, { status: 500 });
    }
// Save to insights table
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabase.from('insights').insert({
    // Optionally save to Supabase insights table
    try {
      await supabase.from('insights').insert({
        content: result.cortexInsight,
        title: `Math: ${result.problem}`,
        metadata: { score: result.score, correct: result.correct, steps: result.steps },
        generated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      // Non-fatal — still return result even if save fails
      console.error('DB save failed:', dbErr.message);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Math checker error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
