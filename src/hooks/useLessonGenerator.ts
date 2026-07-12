"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface GeneratedLesson {
  title: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
    type: "explanation" | "example" | "definition" | "tip";
  }>;
  practiceQuestions: Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  }>;
  estimatedMinutes: number;
}

export function useLessonGenerator() {
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (subject: string, topic: string) => {
    try {
      setGenerating(true);
      setError(null);
      setLesson(null);

      const res = await fetch("/api/cortex/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate lesson");
      }

      const data = await res.json();
      setLesson(data.lesson);
      return data.lesson;
    } catch (err) {
      console.error("[useLessonGenerator] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  return { lesson, generating, error, generate };
}
