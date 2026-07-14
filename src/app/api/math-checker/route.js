import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const topic = formData.get('topic') || 'General Math';

    if (!imageFile) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // FIXED: Use gemini-1.5-flash for vision analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this student's math work on "${topic}". 
    Provide a score (0-100), identify error types, and give a brief Cortex Insight.
    Format as JSON: {"score": 80, "correct": false, "cortexInsight": "...", "steps": []}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: imageFile.type, data: base64 } },
    ]);

    const text = result.response.text();
    const cleanJson = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    return NextResponse.json(cleanJson);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}