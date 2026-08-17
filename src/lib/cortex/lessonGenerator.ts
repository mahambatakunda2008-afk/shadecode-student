/** Cortex lesson generation with bounded AI execution and safe fallback. */
import { callAI } from "@/lib/ai";
import { getMemory } from "./memory";
import { awardXPBySource } from "@/lib/xp/manager";

export interface GeneratedLesson { title: string; subject: string; difficulty: "easy" | "medium" | "hard"; summary: string; sections: LessonSection[]; practiceQuestions: PracticeQuestion[]; estimatedMinutes: number; }
export interface LessonSection { heading: string; content: string; type: "explanation" | "example" | "definition" | "tip"; }
export interface PracticeQuestion { question: string; options?: string[]; correctAnswer: string; explanation: string; difficulty: "easy" | "medium" | "hard"; }

const LESSON_SYSTEM_PROMPT = `You are an expert curriculum designer for Shadecode Student. Generate a structured lesson and return ONLY valid JSON. Include 3-5 sections and 2-5 practice questions. Use age-appropriate language and real-world examples.`;

function normalizeLesson(subject: string, raw: unknown): GeneratedLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const sections = Array.isArray(x.sections) ? x.sections.map((s) => {
    if (!s || typeof s !== "object") return null;
    const v = s as Record<string, unknown>;
    const type = v.type === "example" || v.type === "definition" || v.type === "tip" ? v.type : "explanation";
    return typeof v.heading === "string" && typeof v.content === "string" ? { heading: v.heading.slice(0, 200), content: v.content.slice(0, 5000), type } : null;
  }).filter(Boolean).slice(0, 8) as LessonSection[] : [];
  const practiceQuestions = Array.isArray(x.practiceQuestions) ? x.practiceQuestions.map((q) => {
    if (!q || typeof q !== "object") return null;
    const v = q as Record<string, unknown>;
    const difficulty = v.difficulty === "easy" || v.difficulty === "hard" ? v.difficulty : "medium";
    return typeof v.question === "string" && typeof v.correctAnswer === "string" && typeof v.explanation === "string" ? { question: v.question.slice(0, 1000), options: Array.isArray(v.options) ? v.options.filter((o): o is string => typeof o === "string").slice(0, 6) : undefined, correctAnswer: v.correctAnswer.slice(0, 500), explanation: v.explanation.slice(0, 2000), difficulty } : null;
  }).filter(Boolean).slice(0, 8) as PracticeQuestion[] : [];
  if (typeof x.title !== "string" || typeof x.summary !== "string" || sections.length === 0) return null;
  const difficulty = x.difficulty === "easy" || x.difficulty === "hard" ? x.difficulty : "medium";
  const minutes = Number(x.estimatedMinutes);
  return { title: x.title.slice(0, 300), subject, difficulty, summary: x.summary.slice(0, 1500), sections, practiceQuestions, estimatedMinutes: Number.isFinite(minutes) ? Math.min(120, Math.max(5, Math.round(minutes))) : 15 };
}

export async function generateLesson(subject: string, topic: string, userId: string): Promise<GeneratedLesson | null> {
  try {
    const memory = await getMemory(userId);
    const difficulty = memory.level <= 3 ? "easy" : memory.level <= 6 ? "medium" : "hard";
    const prompt = `${LESSON_SYSTEM_PROMPT}\n\nSubject: ${subject}\nTopic: ${topic}\nTarget difficulty: ${difficulty}\nStudent level: ${memory.level}\nStrengths: ${(memory.strongSubjects ?? []).join(", ") || "none"}\nWeak areas: ${(memory.weakSubjects ?? []).join(", ") || "none"}\n\nGenerate the lesson:`;
    const response = await callAI(prompt, 4000, { userId, feature: "lesson_assistant", subfeature: "generate_lesson", maxChainMs: 35000, perProviderMaxMs: 9000 });
    if (!response) return fallbackLesson(subject, topic, difficulty);
    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return fallbackLesson(subject, topic, difficulty);
    const parsed = JSON.parse(jsonMatch[0]);
    const lesson = normalizeLesson(subject, parsed);
    if (!lesson) return fallbackLesson(subject, topic, difficulty);
    await awardXPBySource(userId, "lesson_generation", { difficulty });
    return lesson;
  } catch (error) {
    console.error("[LessonGenerator] Failed:", error);
    return fallbackLesson(subject, topic, "medium");
  }
}

function fallbackLesson(subject: string, topic: string, difficulty: string): GeneratedLesson {
  return { title: `Introduction to ${topic}`, subject, difficulty: difficulty as "easy" | "medium" | "hard", summary: `A structured introduction to ${topic} in ${subject}.`, sections: [{ heading: `What is ${topic}?`, content: `${topic} is an important concept in ${subject}. This lesson covers the fundamental ideas and key principles.`, type: "explanation" }, { heading: "Key Concepts", content: `The main ideas behind ${topic} include its core principles, applications, and connections to other topics in ${subject}.`, type: "definition" }, { heading: "Real-World Example", content: `${topic} appears in real-world scenarios. Understanding it builds a stronger foundation in ${subject}.`, type: "example" }], practiceQuestions: [{ question: `What is the main focus of ${topic}?`, options: [`Understanding core concepts of ${topic}`, "Learning unrelated material", "Skipping foundational knowledge", "Memorizing without understanding"], correctAnswer: `Understanding core concepts of ${topic}`, explanation: `${topic} focuses on building a solid understanding of its core principles in ${subject}.`, difficulty: "easy" }], estimatedMinutes: 15 };
}
