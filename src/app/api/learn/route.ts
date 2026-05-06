import { NextResponse } from "next/server";

// ===== CACHE =====
const cache = new Map<string, string>();

// ===== HELPERS =====
function normalize(input: string) {
  return input.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function fetchWithTimeout(url: string, options: any, timeout = 6000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeout)
    )
  ]);
}

// ===== GEMINI (PRIMARY - FREE) =====
async function callGemini(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini failed: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ===== OPENAI (SECONDARY - STABLE) =====
async function callOpenAI(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      })
    }
  );

  if (!res.ok) {
    throw new Error(`OpenAI failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===== OPENROUTER (LAST RESORT) =====
async function callOpenRouter(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      })
    }
  );

  if (!res.ok) {
    throw new Error(`OpenRouter failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===== MAIN ROUTE =====
export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const key = normalize(message);

    // 🧊 CACHE HIT
    if (cache.has(key)) {
      return NextResponse.json({
        response: cache.get(key),
        source: "cache"
      });
    }

    let responseText = "";

    // 🥇 TRY GEMINI
    try {
      responseText = await callGemini(message);
      if (responseText) {
        cache.set(key, responseText);
        return NextResponse.json({ response: responseText, source: "gemini" });
      }
    } catch (err) {
      console.log("Gemini failed →", err);
    }

    // 🥈 FALLBACK → OPENAI
    try {
      responseText = await callOpenAI(message);
      if (responseText) {
        cache.set(key, responseText);
        return NextResponse.json({ response: responseText, source: "openai" });
      }
    } catch (err) {
      console.log("OpenAI failed →", err);
    }

    // 🥉 LAST RESORT → OPENROUTER
    try {
      responseText = await callOpenRouter(message);
      if (responseText) {
        cache.set(key, responseText);
        return NextResponse.json({
          response: responseText,
          source: "openrouter"
        });
      }
    } catch (err) {
      console.log("OpenRouter failed →", err);
    }

    // 🧯 TOTAL FAILURE (VERY RARE)
    return NextResponse.json(
      {
        response:
          "All AI services are currently busy. Try again in a few seconds."
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Fatal error:", err);

    return NextResponse.json(
      {
        response: "Something went wrong. Please try again."
      },
      { status: 200 }
    );
  }
}
