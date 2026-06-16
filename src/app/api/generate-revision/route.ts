import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { generateRevisionSchema, validateRequestBody } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/tracker";

export async function POST(req: Request) {
  // Apply rate limiting for AI-powered endpoint
  const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
  if (rateLimitCheck) return rateLimitCheck;

  const body = await req.json();
  
  // Validate request body
  const validation = validateRequestBody(body, generateRevisionSchema);
  if (!validation.success || !validation.data) {
    return new Response(JSON.stringify({ 
      error: 'Validation failed', 
      details: validation.details?.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
    }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const { content, topic } = validation.data;

  const prompt = `
You are a study assistant.

Convert this lesson into structured revision data.

Return ONLY valid JSON in this format:

{
  "summary": "",
  "flashcards": [
    { "q": "", "a": "" }
  ],
  "questions": [
    ""
  ]
}

Topic: ${topic}

Content:
${content}
`;

  const startTime = Date.now();
  const promptTokens = Math.ceil(prompt.length / 4);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;

    if (!output) {
      const latencyMs = Date.now() - startTime;
      
      await logAIUsage({
        userId: undefined,
        feature: 'content_generation',
        subfeature: 'generate_revision',
        provider: 'openai',
        model: 'gpt-4o-mini',
        promptTokens,
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: 'No output from OpenAI',
        errorCode: 'NO_OUTPUT',
        requestMetadata: { topic, contentLength: content.length },
      });
      
      return NextResponse.json({ error: "No output from AI" }, { status: 500 });
    }

    const latencyMs = Date.now() - startTime;
    const completionTokens = Math.ceil(output.length / 4);

    // Log successful request
    await logAIUsage({
      userId: undefined,
      feature: 'content_generation',
      subfeature: 'generate_revision',
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens,
      completionTokens,
      latencyMs,
      success: true,
      requestMetadata: { topic, contentLength: content.length },
    });

    return NextResponse.json(JSON.parse(output));
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    
    // Log failed request
    await logAIUsage({
      userId: undefined,
      feature: 'content_generation',
      subfeature: 'generate_revision',
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens,
      completionTokens: 0,
      latencyMs,
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error instanceof Error ? error.constructor.name : 'UNKNOWN',
      requestMetadata: { topic, contentLength: content.length },
    });
    
    throw error;
  }
}
