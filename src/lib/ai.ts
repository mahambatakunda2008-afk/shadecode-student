// src/lib/ai.ts
// Unified AI caller — Cloudflare primary, others as fallback

export async function callAI(prompt: string, maxTokens = 2000): Promise<string | null> {
  // 1. Cloudflare Workers AI (primary — free, no limits)
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/6a119f6052c02197d301e50f0d4a56cc/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
          }),
        }
      );
      const data = await res.json() as any;
      const text = data?.result?.response;
      if (text) {
        console.log("Success with Cloudflare AI");
        return text;
      }
    } catch (err) {
      console.error("Cloudflare AI failed:", err);
    }
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
        }),
      });
      const data = await res.json() as any;
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log("Success with OpenAI");
        return text;
      }
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  // 3. Gemini keys
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        const data = await res.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`Success with Gemini ${model}`);
          return text;
        }
      } catch (err) {
        console.error(`Gemini ${model} failed:`, err);
      }
    }
  }

  // 4. OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenRouter failed:", err);
    }
  }

  return null;
}
