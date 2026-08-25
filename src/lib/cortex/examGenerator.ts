/** Cortex exam generation with strict validation and bounded AI execution. */
import { callAI } from "@/lib/ai";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { getMemory } from "./memory";

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

const GENERATOR_VERSION = "exam-quality-v3";
const EXAM_SYSTEM_PROMPT = `You are a senior Cambridge/International A-Level exam setter and assessment editor for Shadecode Student.

Your job is to write REAL exam questions, not study prompts, definitions, conversation starters, or generic AI questions.
Return ONLY one valid JSON object. No markdown and no commentary.

QUALITY STANDARD
- Every question must be answerable from the stated subject/topic and must test a concrete skill or piece of knowledge.
- Use authentic exam wording: command verbs such as calculate, determine, explain, state, describe, compare, analyse, derive, evaluate, predict, sketch, construct, or discuss where appropriate.
- Prefer application, interpretation, calculation, multi-step reasoning, data handling, unfamiliar contexts, and common exam traps over trivial recall.
- Do not invent impossible facts, ambiguous conditions, missing numerical data, or contradictory instructions.
- Do not repeat the same task with superficial wording changes.
- Do not use phrases such as "a key principle", "an important concept", "give a relevant example" or "explain a key principle" unless the question then names a precise examinable target.
- If a topic is supplied, ALL questions must stay inside that topic. Do not silently substitute a neighbouring topic.
- Difficulty must be meaningful: easy = direct one-step application, medium = multi-step/application, hard = unfamiliar or integrated reasoning.
- Marks must match the work required. Never award 1 mark to a genuinely multi-step calculation.
- Model answers must actually answer the question. Marking criteria must be specific enough for an examiner to use.

SUBJECT-SPECIFIC EXPECTATIONS
- Mathematics: use actual expressions, equations, numerical values, graphs, proof, modelling, or multi-step calculations where suitable. Do not make every question a definition.
- Physics: use physical quantities, units, equations, calculations, experiments/data, graphs, explanations, and realistic contexts. Include units and sensible values when numerical work is requested.
- Chemistry: use equations, structures, calculations, observations, trends, mechanisms, bonding, energetics, equilibria, or practical interpretation as appropriate.
- Computer Science: use algorithms, pseudocode, trace tables, data structures, computational thinking, complexity, architecture, databases, networking, or programming tasks as appropriate. Avoid generic "what is X?" questions unless recall is genuinely the assessed skill.
- Biology: use biological processes, data, experimental design, calculations, graphs, application and evaluation, not only definitions.
- Economics/Business/Accounting/Geography/History/English: use realistic scenarios, source/data interpretation, structured analysis, evaluation, and evidence where appropriate.

QUESTION MIX
Create a deliberate mix of question types. MCQs must have exactly four plausible, distinct options with one clearly correct answer. Do not make the correct option consistently longer or always use the same option position.
For structured questions, use parts (a), (b), (c) when that makes the assessment more realistic, but keep the full question in one string.

JSON SHAPE
{
  "title": "...",
  "durationMinutes": 45,
  "topics": ["..."],
  "questions": [
    {
      "type": "multiple_choice|short_answer|structured|essay",
      "question": "...",
      "options": ["A...", "B...", "C...", "D..."],
      "marks": 2,
      "topic": "exact requested topic",
      "difficulty": "easy|medium|hard",
      "modelAnswer": "...",
      "markingCriteria": "..."
    }
  ]
}

Do a silent examiner-quality check before returning JSON. Remove any question that is generic, duplicated, outside the topic, mathematically/scientifically inconsistent, under-specified, or mismatched to its marks.`;

const MEMORY_BUDGET_MS = 2000;
const AI_BUDGET_MS = 22000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(value => { clearTimeout(timer); resolve(value); }).catch(() => { clearTimeout(timer); resolve(fallback); });
  });
}

function cleanTopic(topic: string): string {
  return topic.replace(/\s*\((?:O-Level|A-Level|University|O-Level standard|A-Level standard|university entrance standard)[^)]*\)\s*$/i, "").trim();
}

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/\$[^$]+\$/g, "math").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function looksGeneric(question: string): boolean {
  const q = normalizedText(question);
  const badPatterns = [
    "which statement best describes a key principle",
    "explain a key principle",
    "state a key principle",
    "give a relevant example where appropriate",
    "what is an important concept",
    "describe an important concept",
  ];
  return badPatterns.some(pattern => q.includes(pattern)) || q.length < 24;
}

function isQuestion(value: unknown): value is Partial<ExamQuestion> {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<ExamQuestion>;
  return typeof q.question === "string" && q.question.trim().length >= 24 && typeof q.topic === "string" && q.topic.trim().length > 0 && Number.isFinite(Number(q.marks));
}

function topicMatches(requestedTopic: string, questionTopic: string, questionText: string): boolean {
  if (!requestedTopic) return true;
  const wanted = normalizedText(cleanTopic(requestedTopic));
  const actual = normalizedText(cleanTopic(questionTopic));
  const text = normalizedText(questionText);
  if (!wanted) return true;
  return actual.includes(wanted) || wanted.includes(actual) || text.includes(wanted);
}

function dedupeQuestions(questions: Partial<ExamQuestion>[]): Partial<ExamQuestion>[] {
  const seen = new Set<string>();
  const result: Partial<ExamQuestion>[] = [];
  for (const q of questions) {
    const key = normalizedText(q.question || "");
    if (!key || seen.has(key)) continue;
    const words = new Set(key.split(" ").filter(Boolean));
    const nearDuplicate = result.some(existing => {
      const other = normalizedText(existing.question || "");
      const otherWords = new Set(other.split(" ").filter(Boolean));
      if (!words.size || !otherWords.size) return false;
      const overlap = [...words].filter(word => otherWords.has(word)).length / Math.max(words.size, otherWords.size);
      return overlap >= 0.86;
    });
    if (nearDuplicate) continue;
    seen.add(key);
    result.push(q);
  }
  return result;
}

function normalizeQuestion(q: Partial<ExamQuestion>, index: number, difficulty: string, requestedTopic: string): ExamQuestion | null {
  if (!isQuestion(q) || looksGeneric(q.question!)) return null;
  if (!topicMatches(requestedTopic, q.topic!, q.question!)) return null;

  const rawType = q.type as string;
  const requestedType: QuestionType = ["multiple_choice", "short_answer", "structured", "essay"].includes(rawType) ? rawType as QuestionType : "short_answer";
  let options = requestedType === "multiple_choice"
    ? (Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0).map(o => o.trim()).slice(0, 4) : [])
    : undefined;

  if (requestedType === "multiple_choice") {
    const unique = new Set((options || []).map(normalizedText));
    if (unique.size !== 4) return null;
  }

  const normalizedDifficulty: "easy" | "medium" | "hard" = q.difficulty === "hard" || q.difficulty === "medium" ? q.difficulty : difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const marks = Math.max(1, Math.min(20, Math.round(Number(q.marks))));
  if (normalizedDifficulty === "hard" && marks < 2 && requestedType !== "multiple_choice") return null;

  return {
    id: `q_${index + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: requestedType,
    question: q.question!.trim().slice(0, 5000),
    options,
    marks,
    topic: cleanTopic(q.topic!.trim()).slice(0, 255) || requestedTopic || "General",
    difficulty: normalizedDifficulty,
    modelAnswer: typeof q.modelAnswer === "string" && q.modelAnswer.trim() ? q.modelAnswer.trim().slice(0, 5000) : undefined,
    markingCriteria: typeof q.markingCriteria === "string" && q.markingCriteria.trim() ? q.markingCriteria.trim().slice(0, 2500) : undefined,
  };
}

function isExamPayload(value: unknown): value is { title?: unknown; questions: unknown[]; durationMinutes?: unknown; topics?: unknown } {
  return !!value && typeof value === "object" && Array.isArray((value as { questions?: unknown }).questions);
}

function buildPrompt(subject: string, topics: string[], difficulty: string, count: number, memory: Awaited<ReturnType<typeof getMemory>>) {
  const cleanTopics = topics.map(cleanTopic).filter(Boolean);
  const primaryTopic = cleanTopics[0] || "the full syllabus";
  const weakAreas = Array.isArray(memory.weakTopics) ? memory.weakTopics : [];
  return `${EXAM_SYSTEM_PROMPT}\n\nEXAM BRIEF\nSubject: ${subject}\nRequested topic(s): ${cleanTopics.join(", ") || "Full syllabus"}\nPrimary topic constraint: ${primaryTopic}\nDifficulty: ${difficulty}\nStudent level: ${memory.level}\nNumber of final questions required: ${count}\nNumber of candidates to generate: ${Math.min(30, Math.max(count + 4, Math.ceil(count * 1.5)))}\nStrengths: ${(memory.strongSubjects ?? []).join(", ") || "none"}\nWeak areas: ${weakAreas.join(", ") || "none"}\n\nIMPORTANT: Return enough high-quality candidates for the local validator to remove weak or duplicate questions. The final paper must still contain at least ${count} strong questions. If a single topic is requested, do not drift into another topic.`;
}

export async function generateExam(subject: string, topics: string[], difficulty: string, questionCount: number, userId: string): Promise<GeneratedExam | null> {
  const safeCount = Math.max(1, Math.min(20, Math.round(questionCount)));
  const safeSubject = subject.trim().slice(0, 120);
  const safeTopics = topics.map(cleanTopic).filter(Boolean).slice(0, 10);
  if (!safeSubject) return null;

  try {
    const memory = await withTimeout(getMemory(userId), MEMORY_BUDGET_MS, {
      level: 1, streak: 0, xp: 0, totalTasks: 0, completedTasks: 0,
      subjects: [], weakTopics: [], frequentlyStudiedSubjects: [], strongSubjects: [],
      preferredStudyHours: [], averageSessionDuration: 0, totalStudySessions: 0,
      examScores: [], averageExamScore: 0, longestStreak: 0, totalLessonsCompleted: 0,
      totalStudyTimeMinutes: 0,
    });

    const prompt = buildPrompt(safeSubject, safeTopics, difficulty, safeCount, memory);
    const response = await withTimeout(callAI(prompt, 7000, {
      userId,
      feature: "exam_sim",
      subfeature: "generate_exam",
      maxChainMs: 20000,
      perProviderMaxMs: 5000,
    }), AI_BUDGET_MS, null);

    if (!response) {
      console.warn(`[ExamGenerator:${GENERATOR_VERSION}] AI generation unavailable; refusing to return generic fake questions.`);
      return null;
    }

    const parsed = repairAndParseJSON(response, isExamPayload);
    if (!parsed) return null;

    const candidates = dedupeQuestions(parsed.questions.filter(isQuestion));
    const questions = candidates
      .map((q, i) => normalizeQuestion(q, i, difficulty, safeTopics[0] || ""))
      .filter((q): q is ExamQuestion => Boolean(q));

    if (questions.length < safeCount) {
      console.warn(`[ExamGenerator:${GENERATOR_VERSION}] Quality gate rejected generation: ${questions.length}/${safeCount} usable questions.`);
      return null;
    }

    const finalQuestions = questions.slice(0, safeCount);
    const generatedTopics = Array.isArray(parsed.topics)
      ? parsed.topics.filter((t): t is string => typeof t === "string" && t.trim()).map(cleanTopic).slice(0, 20)
      : safeTopics;

    return {
      subject: safeSubject,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 255) : `${safeSubject} Practice Exam`,
      questions: finalQuestions,
      totalMarks: finalQuestions.reduce((sum, q) => sum + q.marks, 0),
      durationMinutes: Math.max(5, Math.min(240, Math.round(Number(parsed.durationMinutes) || safeCount * 3))),
      difficulty,
      topics: generatedTopics.length ? generatedTopics : safeTopics,
    };
  } catch (error) {
    console.error(`[ExamGenerator:${GENERATOR_VERSION}] Failed:`, error);
    return null;
  }
}
