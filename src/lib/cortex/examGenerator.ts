/**
 * Cortex Exam Generator
 *
 * AI-powered exam generation with strict output validation and a deterministic
 * fallback so Exam Simulation remains usable when an AI provider or model
 * response fails.
 */

import { callAI } from "@/lib/ai";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { getMemory } from "./memory";

export type QuestionType = "multiple_choice" | "short_answer" | "structured" | "essay";
export interface ExamQuestion { id: string; type: QuestionType; question: string; options?: string[]; marks: number; topic: string; difficulty: "easy" | "medium" | "hard"; modelAnswer?: string; markingCriteria?: string; }
export interface GeneratedExam { subject: string; title: string; questions: ExamQuestion[]; totalMarks: number; durationMinutes: number; difficulty: string; topics: string[]; }

const EXAM_SYSTEM_PROMPT = `You are an experienced exam setter for Shadecode Student.
Generate a realistic exam paper. Return ONLY valid JSON.
Output format: {"title":"Exam title","questions":[{"type":"multiple_choice|short_answer|structured|essay","question":"Question text","options":["A","B","C","D"],"marks":1,"topic":"Topic name","difficulty":"easy|medium|hard","modelAnswer":"Expected answer","markingCriteria":"How marks are awarded"}],"totalMarks":25,"durationMinutes":30,"topics":["topic1"]}
Rules: clear wording, age-appropriate difficulty, realistic exam conditions, valid JSON only. MCQs must have exactly four options.`;

function isQuestion(value: unknown): value is Partial<ExamQuestion> {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<ExamQuestion>;
  return typeof q.question === "string" && q.question.trim().length > 3 && typeof q.topic === "string" && q.topic.trim().length > 0;
}

function normalizeQuestion(q: Partial<ExamQuestion>, index: number, subject: string, difficulty: string): ExamQuestion {
  const type: QuestionType = ["multiple_choice", "short_answer", "structured", "essay"].includes(q.type as string) ? q.type as QuestionType : "short_answer";
  const normalizedDifficulty: "easy" | "medium" | "hard" = q.difficulty === "hard" || q.difficulty === "medium" ? q.difficulty : difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const options = type === "multiple_choice" ? (Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0).slice(0, 4) : []) : undefined;
  return {
    id: `q_${index + 1}_${Date.now()}`,
    type: options && options.length === 4 ? type : type === "multiple_choice" ? "short_answer" : type,
    question: q.question!.trim().slice(0, 4000),
    options: options && options.length === 4 ? options : undefined,
    marks: Number.isFinite(q.marks) ? Math.max(1, Math.min(20, Math.round(q.marks as number))) : 1,
    topic: q.topic!.trim().slice(0, 255),
    difficulty: normalizedDifficulty,
    modelAnswer: typeof q.modelAnswer === "string" ? q.modelAnswer.slice(0, 4000) : undefined,
    markingCriteria: typeof q.markingCriteria === "string" ? q.markingCriteria.slice(0, 2000) : undefined,
  };
}

function isExamPayload(value: unknown): value is { title?: unknown; questions: unknown[]; totalMarks?: unknown; durationMinutes?: unknown; topics?: unknown } {
  return !!value && typeof value === "object" && Array.isArray((value as { questions?: unknown }).questions);
}

export async function generateExam(subject: string, topics: string[], difficulty: string, questionCount: number, userId: string): Promise<GeneratedExam | null> {
  const safeCount = Math.max(1, Math.min(20, Math.round(questionCount)));
  try {
    const memory = await getMemory(userId);
    const studentContext = `Student level: ${memory.level}\nStrengths: ${(memory.strongSubjects ?? []).join(", ") || "none"}\nWeak areas: ${(memory.weakSubjects ?? []).join(", ") || "none"}${memory.averageExamScore ? `\nAverage exam score: ${memory.averageExamScore}%` : ""}`;
    const prompt = `${EXAM_SYSTEM_PROMPT}\n\nSubject: ${subject}\nTopics: ${topics.join(", ")}\nDifficulty: ${difficulty}\nNumber of questions: ${safeCount}\n\nStudent context:\n${studentContext}\n\nGenerate the exam.`;
    const response = await callAI(prompt, 5000, { userId, feature: "exam_sim", subfeature: "generate_exam" });
    if (response) {
      const parsed = repairAndParseJSON(response, isExamPayload);
      const rawQuestions = parsed?.questions.filter(isQuestion) ?? [];
      if (rawQuestions.length >= Math.max(1, Math.ceil(safeCount * 0.6))) {
        const questions = rawQuestions.slice(0, safeCount).map((q, i) => normalizeQuestion(q, i, subject, difficulty));
        if (questions.length) {
          return { subject, title: typeof parsed?.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 255) : `${subject} Practice Exam`, questions, totalMarks: questions.reduce((s, q) => s + q.marks, 0), durationMinutes: Math.max(5, Math.round(Number(parsed?.durationMinutes) || safeCount * 3)), difficulty, topics: Array.isArray(parsed?.topics) ? parsed.topics.filter((t): t is string => typeof t === "string").slice(0, 20) : topics };
        }
      }
    }
  } catch (error) {
    console.error("[ExamGenerator] Failed:", error);
  }
  return fallbackExam(subject, difficulty, safeCount, topics);
}

function fallbackExam(subject: string, difficulty: string, count: number, requestedTopics: string[] = []): GeneratedExam {
  const topic = requestedTopics.find(Boolean) || `General ${subject}`;
  const questions: ExamQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const type: QuestionType = i % 3 === 0 ? "multiple_choice" : i % 3 === 1 ? "short_answer" : "structured";
    questions.push({ id: `q_${i + 1}_${Date.now()}`, type, question: type === "multiple_choice" ? `Which statement best describes a key principle of ${topic}?` : `Explain a key principle of ${topic}, giving a relevant example where appropriate.`, options: type === "multiple_choice" ? ["It is always constant.", "It depends on the stated conditions.", "It has no measurable effect.", "It is unrelated to the topic." ] : undefined, marks: i < 3 ? 1 : i < 6 ? 2 : 3, topic, difficulty: i < 3 ? "easy" : i < 6 ? "medium" : "hard", modelAnswer: type === "multiple_choice" ? "It depends on the stated conditions." : `A correct explanation should identify the key principle of ${topic} and apply it accurately.` });
  }
  return { subject, title: `${subject} Practice Exam`, questions, totalMarks: questions.reduce((s, q) => s + q.marks, 0), durationMinutes: Math.max(5, count * 3), difficulty, topics: [topic] };
}
