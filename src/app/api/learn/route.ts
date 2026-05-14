import { NextResponse } from "next/server";

import { callAI } from "./providers";
import { extractJSON } from "./parser";
import { lessonPrompt, quizPrompt } from "./prompts";

export async function POST(req: Request) {
  try {
    const { type, subject, topic, mode = "standard" } =
      await req.json();

    // ---------------- LESSON ----------------
    if (type === "lesson") {
      const prompt = lessonPrompt(
        subject,
        topic,
        mode
      );

      const text = await callAI(prompt, 2500);

      if (!text) {
        return NextResponse.json({
          blocks: [
            {
              type: "intro",
              title: "Unavailable",
              content:
                "AI is currently unavailable.",
            },
          ],
          xpReward: 10,
          difficulty: mode,
        });
      }

      try {
        return NextResponse.json(
          extractJSON(text)
        );
      } catch {
        return NextResponse.json({
          blocks: [
            {
              type: "intro",
              title: topic,
              content:
                "Could not generate structured lesson.",
            },
          ],
          xpReward: 10,
          difficulty: mode,
        });
      }
    }

    // ---------------- QUIZ ----------------
    if (type === "quiz") {
      const prompt = quizPrompt(
        subject,
        topic,
        mode
      );

      const text = await callAI(prompt, 2000);

      if (!text) {
        return NextResponse.json({
          questions: [],
        });
      }

      try {
        return NextResponse.json(
          extractJSON(text)
        );
      } catch {
        return NextResponse.json({
          questions: [],
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
