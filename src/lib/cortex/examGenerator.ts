/**
 * Cortex Exam Generator
 *
 * AI-powered exam generation that creates personalized
 * question papers based on the student's weak areas,
 * curriculum progress, and exam board standards.
 */

import { callAI } from "@/lib/ai";
import { getMemory, updateMemory } from "./memory";

export type QuestionType = "multiple_choice" | "short_answer" | "structured" | "essay";

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  marks: number;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  modelAnswer?: string;
  markingCriteria?: string;
}

export interface GeneratedExam {
  subject: string;
  title: string;
  questions: ExamQuestion[];
  totalMarks: number;
  durationMinutes: number;
  difficulty: string;
  topics: string[];
}

const EXAM_SYSTEM_PROMPT = `You are an experienced exam setter for Shadecode Student.
Generate a realistic exam paper. Return ONLY valid JSON.

Output format:
{
  "title": "Exam title",
  "questions": [
    {
      "type": "multiple_choice|short_answer|structured",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "marks": 1,
      "topic": "Topic name",
      "difficulty": "easy|medium|hard",
      "modelAnswer": "Expected answer",
      "markingCriteria": "How marks are awarded"
    }
  ],
  "totalMarks": 25,
  "durationMinutes": 30,
  "topics": ["topic1", "topic2"]
}

Rules:
- Mix of question types
- Clear, unambiguous wording
- Age-appropriate difficulty
- Realistic exam conditions
- Output valid JSON only`;

export async function generateExam(
  subject: string,
  topics: string[],
  difficulty: string,
  questionCount: number,
  userId: string
): Promise<GeneratedExam | null> {
  try {
    const memory = await getMemory(userId);

    const studentContext = `Student level: ${memory.level}
Strengths: ${(memory.strongSubjects ?? []).join(", ") || "none"}
Weak areas: ${(memory.weakSubjects ?? []).join(", ") || "none"}
${memory.averageExamScore ? `Average exam score: ${memory.averageExamScore}%` : "No prior exams"}`;

    const prompt = `${EXAM_SYSTEM_PROMPT}

Subject: ${subject}
Topics: ${topics.join(", ")}
Difficulty: ${difficulty}
Number of questions: ${questionCount}

Student context to tailor difficulty:
${studentContext}

Generate the exam:`;

    const response = await callAI(prompt, 6000);
    if (!response) return null;

    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackExam(subject, difficulty, questionCount);

    const exam = JSON.parse(jsonMatch[0]) as GeneratedExam;
    exam.subject = subject;
    exam.questions = exam.questions.map((q, i) => ({
      ...q,
      id: `q_${i + 1}_${Date.now()}`,
    }));

    return exam;
  } catch (error) {
    console.error("[ExamGenerator] Failed:", error);
    return fallbackExam(subject, difficulty, questionCount);
  }
}

function fallbackExam(subject: string, difficulty: string, count: number): GeneratedExam {
  const questions: ExamQuestion[] = [];
  const topics = [`General ${subject}`];

  for (let i = 0; i < Math.min(count, 10); i++) {
    questions.push({
      id: `q_${i + 1}_${Date.now()}`,
      type: i % 3 === 0 ? "multiple_choice" : i % 3 === 1 ? "short_answer" : "structured",
      question: `Question ${i + 1}: Explain a key concept in ${subject}.`,
      options: i % 3 === 0 ? ["Option A", "Option B", "Option C", "Option D"] : undefined,
      marks: i < 3 ? 1 : i < 6 ? 2 : 3,
      topic: topics[0],
      difficulty: i < 3 ? "easy" : i < 6 ? "medium" : "hard",
    });
  }

  return {
    subject,
    title: `${subject} Practice Exam`,
    questions,
    totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    durationMinutes: count * 3,
    difficulty,
    topics,
  };
}
