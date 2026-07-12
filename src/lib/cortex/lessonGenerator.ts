/**
 * Cortex Lesson Generator
 *
 * AI-powered lesson content generation using the student's
 * learning profile for personalized, adaptive lessons.
 */

import { callAI } from "@/lib/ai";
import { getMemory } from "./memory";
import { awardXPBySource } from "@/lib/xp/manager";

export interface GeneratedLesson {
  title: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  summary: string;
  sections: LessonSection[];
  practiceQuestions: PracticeQuestion[];
  estimatedMinutes: number;
}

export interface LessonSection {
  heading: string;
  content: string;
  type: "explanation" | "example" | "definition" | "tip";
}

export interface PracticeQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

const LESSON_SYSTEM_PROMPT = `You are an expert curriculum designer for Shadecode Student.
Generate a structured lesson on the given topic. Return ONLY valid JSON.

Output format:
{
  "title": "Lesson title",
  "summary": "2-3 sentence overview",
  "difficulty": "easy|medium|hard",
  "sections": [
    { "heading": "Section title", "content": "Detailed content", "type": "explanation|example|definition|tip" }
  ],
  "practiceQuestions": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Why this is correct", "difficulty": "easy|medium|hard" }
  ],
  "estimatedMinutes": 15
}

Rules:
- 3-5 sections of varied types
- 2-5 practice questions (multiple choice for easy/medium, open-ended for hard)
- Age-appropriate language
- Include real-world examples
- Output valid JSON only, no markdown fences`;

export async function generateLesson(
  subject: string,
  topic: string,
  userId: string
): Promise<GeneratedLesson | null> {
  try {
    const memory = await getMemory(userId);
    const difficulty = memory.level <= 3 ? "easy" : memory.level <= 6 ? "medium" : "hard";

    const studentContext = `Student level: ${memory.level}
Strengths: ${(memory.strongSubjects ?? []).join(", ") || "none identified"}
Weak areas: ${(memory.weakSubjects ?? []).join(", ") || "none"}
Total lessons completed: ${memory.totalLessonsCompleted ?? 0}`;

    const prompt = `${LESSON_SYSTEM_PROMPT}\n\nSubject: ${subject}\nTopic: ${topic}\nTarget difficulty: ${difficulty}\n\nStudent context:\n${studentContext}\n\nGenerate the lesson:`;

    const response = await callAI(prompt, 4000);
    if (!response) return null;

    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackLesson(subject, topic, difficulty);

    const lesson = JSON.parse(jsonMatch[0]) as GeneratedLesson;
    lesson.subject = subject;

    await awardXPBySource(userId, "lesson_generation", { difficulty });

    return lesson;
  } catch (error) {
    console.error("[LessonGenerator] Failed:", error);
    return fallbackLesson(subject, topic, "medium");
  }
}

function fallbackLesson(subject: string, topic: string, difficulty: string): GeneratedLesson {
  return {
    title: `Introduction to ${topic}`,
    subject,
    difficulty: difficulty as "easy" | "medium" | "hard",
    summary: `A structured introduction to ${topic} in ${subject}.`,
    sections: [
      {
        heading: `What is ${topic}?`,
        content: `${topic} is an important concept in ${subject}. This lesson covers the fundamental ideas and key principles.`,
        type: "explanation",
      },
      {
        heading: "Key Concepts",
        content: `The main ideas behind ${topic} include understanding its core principles, applications, and how it connects to other topics in ${subject}.`,
        type: "definition",
      },
      {
        heading: "Real-World Example",
        content: `${topic} appears in many real-world scenarios. Understanding it helps build a stronger foundation in ${subject}.`,
        type: "example",
      },
    ],
    practiceQuestions: [
      {
        question: `What is the main focus of ${topic}?`,
        options: [
          `Understanding core concepts of ${topic}`,
          `Learning unrelated material`,
          `Skipping foundational knowledge`,
          `Memorizing without understanding`,
        ],
        correctAnswer: `Understanding core concepts of ${topic}`,
        explanation: `${topic} focuses on building a solid understanding of its core principles in ${subject}.`,
        difficulty: "easy",
      },
    ],
    estimatedMinutes: 15,
  };
}
