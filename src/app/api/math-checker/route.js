// src/app/api/math-checker/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const topic = formData.get('topic') || '';
    const subject = formData.get('subject') || '';
    const question = formData.get('question') || '';
    const userId = formData.get('userId') || '';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let result = null;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are Cortex, a neutral mathematical analysis system inside Shadecode Student.

The student has just studied the topic: "${topic}" in ${subject || 'their subject'}.
${question ? `The specific question they are solving is: "${question}"` : 'They were asked to solve a problem on paper and show their full working.'}

Analyse this student's handwritten working carefully. Do not encourage or motivate — only observe and reflect what the working shows about their understanding.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "problem": "Brief description of the specific math problem visible in the image",
  "score": <number 0-100 representing correctness and method quality>,
  "correct": <true if answer and method are fully correct, false otherwise>,
  "cortexInsight": "2-3 sentences. Neutral, analytical observation about what this working reveals about the student's understanding. Reference specific steps. Do not say well done or good job. Simply describe what the method shows.",
  "errorType": "concept_gap | calculation_error | sign_error | skipped_step | misinterpretation | careless_error | none",
  "steps": [
    {
      "description": "What this step does mathematically",
      "status": "correct | incorrect | warning",
      "note": "Short note about what was right, wrong, missing, or skipped"
    }
  ]
}

Be thorough. Analyse every visible step. If the working is incomplete or skips steps, note exactly which steps are missing.`;

        const response = await model.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64 } },
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

    // ── Supabase actions ──────────────────────────────────────────────────────
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // 1. Save insight
      await supabase.from('insights').insert({
        content: result.cortexInsight,
        title: `${subject} — ${topic}: ${result.problem}`,
        metadata: {
          score: result.score,
          correct: result.correct,
          errorType: result.errorType,
          steps: result.steps,
          topic,
          subject,
          question,
        },
        generated_at: new Date().toISOString(),
      });

      // 2. Auto-create review task if score is low and we have a userId
      if (result.score < 60 && userId) {
        // Find the subject_id from subjects table
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${subject}%`)
          .limit(1)
          .single();

        const taskTitle = `Review: ${topic}${question ? ` — "${question}"` : ''}`;

        await supabase.from('tasks').insert({
          user_id: userId,
          subject_id: subjectData?.id || null,
          title: taskTitle,
          completed: false,
        });

        result.taskCreated = true;
        result.taskTitle = taskTitle;
      }

    } catch (dbErr) {
      console.error('DB error:', dbErr.message);
      // Non-fatal — still return result
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Math checker error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
