/** Cortex lesson generation with structured coverage, diagram-aware content and safe failure handling. */
import { callAI } from "@/lib/ai";
import { getMemory } from "./memory";
import { awardXPBySource } from "@/lib/xp/manager";
import type { DiagramSpec } from "@/lib/learning/content";

export interface GeneratedLesson { title: string; subject: string; difficulty: "easy" | "medium" | "hard"; summary: string; sections: LessonSection[]; practiceQuestions: PracticeQuestion[]; diagrams: LessonDiagram[]; estimatedMinutes: number; coverage: LessonCoverage; }
export interface LessonSection { heading: string; content: string; type: "explanation" | "example" | "definition" | "tip" | "misconception" | "exam" | "curiosity"; }
export interface LessonDiagram { title: string; description: string; spec?: DiagramSpec; }
export interface PracticeQuestion { question: string; options?: string[]; correctAnswer: string; explanation: string; difficulty: "easy" | "medium" | "hard"; skill?: string; diagram?: DiagramSpec; }
export interface LessonCoverage { definitions: number; principles: number; relationships: number; prerequisites: number; applications: number; examples: number; misconceptions: number; practicalContext: number; examSkills: number; transfer: number; curiosity: number; }

const LESSON_SYSTEM_PROMPT = `You are an expert Cambridge-level curriculum designer and teacher for Shadecode Student. Build lessons that create genuine understanding, not shallow summaries. Return ONLY valid JSON. Cover definitions, principles, relationships, prerequisites, applications, worked examples, misconceptions, practical/contextual meaning, exam skills, transfer, and curiosity. Use precise subject terminology, but explain it clearly. Include at least one useful visual/diagram when the topic benefits from one. Include retrieval and transfer questions. Never invent syllabus facts or claim an unsupported diagram is exact.`;
const MEMORY_BUDGET_MS = 2000;
const AI_BUDGET_MS = 26000;
const XP_BUDGET_MS = 1500;

const emptyCoverage = (): LessonCoverage => ({ definitions: 0, principles: 0, relationships: 0, prerequisites: 0, applications: 0, examples: 0, misconceptions: 0, practicalContext: 0, examSkills: 0, transfer: 0, curiosity: 0 });

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(value => { clearTimeout(timer); resolve(value); }).catch(() => { clearTimeout(timer); resolve(fallback); });
  });
}

function normalizeCoverage(raw: unknown): LessonCoverage {
  const result = emptyCoverage();
  if (!raw || typeof raw !== "object") return result;
  for (const key of Object.keys(result) as (keyof LessonCoverage)[]) {
    const value = Number((raw as Record<string, unknown>)[key]);
    result[key] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  }
  return result;
}

function normalizeLesson(subject: string, raw: unknown): GeneratedLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const sections = Array.isArray(x.sections) ? x.sections.map((s) => {
    if (!s || typeof s !== "object") return null;
    const v = s as Record<string, unknown>;
    const allowed = ["example", "definition", "tip", "misconception", "exam", "curiosity"] as const;
    const type = allowed.includes(v.type as typeof allowed[number]) ? v.type as LessonSection["type"] : "explanation";
    return typeof v.heading === "string" && typeof v.content === "string" ? { heading: v.heading.slice(0, 200), content: v.content.slice(0, 7000), type } : null;
  }).filter(Boolean).slice(0, 14) as LessonSection[] : [];
  const diagrams = Array.isArray(x.diagrams) ? x.diagrams.map((d) => {
    if (!d || typeof d !== "object") return null;
    const v = d as Record<string, unknown>;
    return typeof v.title === "string" && typeof v.description === "string" ? { title: v.title.slice(0, 200), description: v.description.slice(0, 2000), spec: v.spec as DiagramSpec | undefined } : null;
  }).filter(Boolean).slice(0, 6) as LessonDiagram[] : [];
  const practiceQuestions = Array.isArray(x.practiceQuestions) ? x.practiceQuestions.map((q) => {
    if (!q || typeof q !== "object") return null;
    const v = q as Record<string, unknown>;
    const difficulty = v.difficulty === "easy" || v.difficulty === "hard" ? v.difficulty : "medium";
    return typeof v.question === "string" && typeof v.correctAnswer === "string" && typeof v.explanation === "string" ? { question: v.question.slice(0, 1800), options: Array.isArray(v.options) ? v.options.filter((o): o is string => typeof o === "string").slice(0, 6) : undefined, correctAnswer: v.correctAnswer.slice(0, 800), explanation: v.explanation.slice(0, 3000), difficulty, skill: typeof v.skill === "string" ? v.skill.slice(0, 120) : undefined, diagram: v.diagram as DiagramSpec | undefined } : null;
  }).filter(Boolean).slice(0, 12) as PracticeQuestion[] : [];
  if (typeof x.title !== "string" || typeof x.summary !== "string" || sections.length < 5 || practiceQuestions.length < 3) return null;
  const difficulty = x.difficulty === "easy" || x.difficulty === "hard" ? x.difficulty : "medium";
  const minutes = Number(x.estimatedMinutes);
  return { title: x.title.slice(0, 300), subject, difficulty, summary: x.summary.slice(0, 2000), sections, practiceQuestions, diagrams, estimatedMinutes: Number.isFinite(minutes) ? Math.min(120, Math.max(10, Math.round(minutes))) : 25, coverage: normalizeCoverage(x.coverage) };
}

export async function generateLesson(subject: string, topic: string, userId: string): Promise<GeneratedLesson | null> {
  try {
    const memory = await withTimeout(getMemory(userId), MEMORY_BUDGET_MS, { level: 1, streak: 0, xp: 0, totalTasks: 0, completedTasks: 0, subjects: [], weakTopics: [], frequentlyStudiedSubjects: [], strongSubjects: [], weakSubjects: [], preferredStudyHours: [], averageSessionDuration: 0, totalStudySessions: 0, examScores: [], averageExamScore: 0, longestStreak: 0, totalLessonsCompleted: 0, totalStudyTimeMinutes: 0 });
    const difficulty = memory.level <= 3 ? "easy" : memory.level <= 6 ? "medium" : "hard";
    const prompt = `${LESSON_SYSTEM_PROMPT}\n\nSubject: ${subject}\nTopic: ${topic}\nTarget difficulty: ${difficulty}\nStudent level: ${memory.level}\nWeak areas: ${(memory.weakSubjects ?? []).join(", ") || "none"}\nStrong areas: ${(memory.strongSubjects ?? []).join(", ") || "none"}\n\nReturn JSON with: title, subject, difficulty, summary, sections, diagrams, practiceQuestions, estimatedMinutes, coverage. Generate the lesson now.`;
    const response = await withTimeout(callAI(prompt, 7000, { userId, feature: "lesson_assistant", subfeature: "generate_lesson", maxChainMs: 22000, perProviderMaxMs: 5000 }), AI_BUDGET_MS, null);
    if (!response) return null;
    const jsonMatch = response.match(/\{[^]*\}/);
    if (!jsonMatch) return null;
    const lesson = normalizeLesson(subject, JSON.parse(jsonMatch[0]));
    if (!lesson) return null;
    void withTimeout(awardXPBySource(userId, "lesson_generation", { difficulty }), XP_BUDGET_MS, undefined);
    return lesson;
  } catch (error) {
    console.error("[LessonGenerator] Failed:", error);
    return null;
  }
}
