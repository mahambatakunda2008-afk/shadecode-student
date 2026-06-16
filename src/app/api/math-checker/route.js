// src/app/api/math-checker/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { mathCheckerSchema, validateRequestBody } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/tracker";

export async function POST(req) {
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const formData = await req.formData();
    const imageFile = formData.get('image');
    const topic = formData.get('topic') || '';
    const subject = formData.get('subject') || '';
    const question = formData.get('question') || '';
    const userId = formData.get('userId') || '';

    // Validate form data
    const validation = validateRequestBody({ topic, subject, question, userId }, mathCheckerSchema);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.details?.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let result = null;
    let successfulModel = null;

    for (const modelName of models) {
      const startTime = Date.now();
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

      const promptTokens = Math.ceil(prompt.length / 4); // Rough estimate

      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const response = await model.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64 } },
        ]);

        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        result = JSON.parse(jsonMatch[0]);
        successfulModel = modelName;
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4); // Rough estimate

        // Log successful request
        await logAIUsage({
          userId,
          feature: 'homework_helper',
          subfeature: 'math_checker',
          provider: 'gemini',
          model: modelName,
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          requestMetadata: { 
            topic, 
            subject, 
            hasQuestion: !!question,
            imageSize: bytes.length 
          },
        });

        break;
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        
        // Log failed request
        await logAIUsage({
          userId,
          feature: 'homework_helper',
          subfeature: 'math_checker',
          provider: 'gemini',
          model: modelName,
          promptTokens,
          completionTokens: 0,
          latencyMs,
          success: false,
          errorMessage: err.message,
          errorCode: err.constructor.name,
          requestMetadata: { 
            topic, 
            subject, 
            hasQuestion: !!question,
            imageSize: bytes.length 
          },
        });

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

      // 1. Save insight (canonical cortex_insights store; requires a user)
      if (userId && result.cortexInsight) {
        await supabase.from('cortex_insights').insert({
          user_id: userId,
          insight: result.cortexInsight,
        });
      }

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
