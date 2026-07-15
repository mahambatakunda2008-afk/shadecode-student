import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const topic = formData.get('topic') || 'General Math';

    if (!imageFile) return NextResponse.json({ error: 'No image' }, { status: 400 });

    if (!process.env.GEMINI_API_KEY) {
      console.error('[math-checker] GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'Math checker is temporarily unavailable.' }, { status: 503 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // gemini-2.0-flash: current, vision-capable, not on the deprecation path like 1.5
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze this student's math work on "${topic}". 
    Provide a score (0-100), identify error types, and give a brief Cortex Insight.
    Format as JSON: {"score": 80, "correct": false, "cortexInsight": "...", "steps": []}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: imageFile.type, data: base64 } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[math-checker] Gemini returned no parseable JSON:', text.slice(0, 200));
      return NextResponse.json({ error: 'Could not read that image clearly. Try a clearer photo.' }, { status: 422 });
    }

    let cleanJson;
    try {
      cleanJson = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[math-checker] JSON.parse failed on Gemini output:', parseErr, text.slice(0, 200));
      return NextResponse.json({ error: 'Could not read that image clearly. Try a clearer photo.' }, { status: 422 });
    }

    return NextResponse.json(cleanJson);
  } catch (err) {
    console.error('[math-checker] Analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}