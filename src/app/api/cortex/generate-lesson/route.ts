/** Cortex Learn generation endpoint. */
import { NextResponse, NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai";
import { buildLessonContent } from "@/lib/cortex/contentBuilder";
import { createExplanationTemplate, createPracticeTemplate, createQuizTemplate } from "@/lib/cortex/templates";
import { getCache, generateCacheKey, shouldCache } from "@/lib/cortex/cache";
import { checkCompleteness, validateLessonStructure } from "@/lib/cortex/validators";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const maxDuration = 90;
export const dynamic = "force-dynamic";

interface GenerateLessonRequest {
  subject?: string;
  topic: string;
  level?: "beginner" | "intermediate" | "advanced";
  format?: "explanation" | "practice" | "quiz";
  subjectId?: string;
}

interface GenerateLessonResponse {
  success: boolean;
  lesson?: any;
  error?: string;
  metadata?: { cached: boolean; processingTime: number; validationScore?: number; completeness?: number; cacheStats?: any };
}

const MIN_VALIDATION_SCORE = 85;

export async function POST(request: NextRequest): Promise<NextResponse<GenerateLessonResponse>> {
  const startTime = Date.now();
  try {
    const rateLimitCheck = await applyRateLimit(request, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck as NextResponse<GenerateLessonResponse>;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as GenerateLessonRequest;
    const requestedSubject = typeof body.subject === "string" ? body.subject.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const level = body.level ?? "intermediate";
    const format = body.format ?? "explanation";

    if (!topic) return NextResponse.json({ success: false, error: "topic is required" }, { status: 400 });
    if (topic.length > 180) return NextResponse.json({ success: false, error: "topic is too long" }, { status: 400 });
    if (!["beginner", "intermediate", "advanced"].includes(level)) return NextResponse.json({ success: false, error: "invalid level" }, { status: 400 });
    if (!["explanation", "practice", "quiz"].includes(format)) return NextResponse.json({ success: false, error: "invalid format" }, { status: 400 });

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject, body.subjectId);
    if (!subjectAccess.ok) return NextResponse.json({ success: false, error: subjectAccess.error }, { status: subjectAccess.status });
    const subject = subjectAccess.subject;
    const subjectId = subjectAccess.subjectId;

    const cache = getCache();
    const cacheTopic = `${subject}::${topic}`;
    const cacheKey = generateCacheKey(cacheTopic, level, format, user.id);
    const cachedContent = await cache.get(cacheKey);

    if (cachedContent) {
      try {
        const cachedLesson = JSON.parse(cachedContent);
        const cachedValidation = validateLessonStructure(cachedLesson);
        const cachedCompleteness = checkCompleteness(cachedLesson);
        if (cachedValidation.isValid && cachedValidation.score >= MIN_VALIDATION_SCORE && cachedCompleteness.coverage >= 85) {
          return NextResponse.json({
            success: true,
            lesson: cachedLesson,
            metadata: { cached: true, processingTime: Date.now() - startTime, validationScore: cachedValidation.score, completeness: cachedCompleteness.coverage, cacheStats: cache.getStats() },
          });
        }
        await cache.clearByType("lesson");
      } catch {
        await cache.clearByType("lesson");
      }
    }

    const template = format === "practice"
      ? createPracticeTemplate(topic, level)
      : format === "quiz"
        ? createQuizTemplate(topic, level)
        : createExplanationTemplate(topic, level);

    const prompt = `You are the senior teacher and exam writer for Shadecode Student.
Create a rigorous ${level}-level ${format} lesson on "${topic}" in ${subject}.

OUTPUT CONTRACT:
Return ONLY one valid JSON object. No markdown fences, no commentary. Use exactly these top-level fields:
title, summary, sections, examples, keyPoints, practice, assessment, estimatedMinutes, concepts, objectives.
Each section must contain heading and content. Each example must contain title, description and solution when useful. Each practice item must contain question, type, correctAnswer, explanation, difficulty. Each assessment item must contain question, type, correctAnswer, maxPoints and rubric.
If the topic is broad, cover its major sub-concepts rather than writing a single overview.

The student should finish able to DEFINE the key terms, EXPLAIN the mechanisms, CONNECT related ideas, APPLY them to unfamiliar situations, SOLVE representative problems, avoid common misconceptions, and recognise how the topic appears in examinations.

Required structure/content:
1. Learning objectives and prerequisites.
2. Precise definitions with intuitive explanations.
3. Core principles and relationships, including equations where relevant.
4. At least two worked examples with reasoning, not just answers.
5. At least one misconception and how to detect/correct it.
6. Practical/real-world context where meaningful.
7. Exam technique and common mark-loss traps.
8. Retrieval questions and at least one transfer/unfamiliar-context question.
9. A curiosity bridge: a deeper question, surprising consequence, or connection that motivates further study.
10. At least one useful diagram when the topic is visual, spatial, mathematical, physical, chemical, algorithmic, or process-based. Describe diagrams precisely enough to render them.

Do not pad the lesson with generic motivational text. Do not invent syllabus facts. Use the authorized subject and topic consistently. Return detailed educational content that a student can actually study from.`;

    const aiResponse = await callAI(prompt, 6500, {
      userId: user.id,
      feature: "lesson_assistant",
      subfeature: "generate_lesson_v2",
      maxChainMs: 26000,
      perProviderMaxMs: 6000,
    });
    if (!aiResponse) return NextResponse.json({ success: false, error: "Cortex could not generate the lesson right now. Please try again." }, { status: 503 });

    let buildResult = await buildLessonContent(aiResponse, {
      template, topic, level, maxTokens: 6500, includeExamples: true, includePractice: true,
    });

    // A provider can return syntactically valid content in an unexpected shape.
    // Repair that response once through the same Cortex gateway instead of exposing
    // a brittle 422 to the learner.
    if (!buildResult.success || !buildResult.lesson) {
      const repairPrompt = `Repair the following attempted lesson for Shadecode Student.
Keep the requested subject "${subject}" and topic "${topic}" exactly. Preserve useful correct teaching content, but fill missing structure.
Return ONLY valid JSON with: title, summary, sections, examples, keyPoints, practice, assessment, estimatedMinutes, concepts, objectives.
Need at least 5 substantial sections, 2 worked examples, 5 practice questions, and 3 assessment questions.
Do not invent board-specific facts.

ATTEMPTED LESSON:
${aiResponse.slice(0, 30000)}`;
      const repaired = await callAI(repairPrompt, 6500, {
        userId: user.id,
        feature: "lesson_assistant",
        subfeature: "repair_lesson_v2",
        maxChainMs: 26000,
        perProviderMaxMs: 6000,
      });
      if (repaired) {
        buildResult = await buildLessonContent(repaired, {
          template, topic, level, maxTokens: 6500, includeExamples: true, includePractice: true,
        });
      }
    }

    if (!buildResult.success || !buildResult.lesson) {
      return NextResponse.json({
        success: false,
        error: "Cortex could not construct a safe lesson from the available inference responses. No partial lesson was shown.",
      }, { status: 503 });
    }

    const lesson = buildResult.lesson;
    const validation = validateLessonStructure(lesson);
    const completeness = checkCompleteness(lesson);
    if (!validation.isValid || validation.score < MIN_VALIDATION_SCORE || completeness.coverage < 85) {
      console.warn("[LessonGenerate] Quality gate rejected lesson", { validationScore: validation.score, completeness: completeness.coverage, errors: validation.errors, missing: completeness.missingFields });
      return NextResponse.json({ success: false, error: "Cortex generated a lesson that did not meet the learning-quality threshold. No low-quality lesson was shown." }, { status: 422 });
    }

    lesson.id = `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    lesson.createdAt = new Date();

    if (shouldCache(JSON.stringify(lesson), "lesson")) {
      try {
        await cache.set(cacheKey, JSON.stringify(lesson), "lesson", undefined, { topic, level, format, userId: user.id, subject });
      } catch (cacheErr) {
        console.warn("[LessonGenerate] Cache write failed", cacheErr);
      }
    }

    try {
      await supabase.from("generated_lessons").insert({
        id: lesson.id, user_id: user.id, topic, subject_id: subjectId,
        title: lesson.title, content: lesson.content, metadata: lesson.metadata,
        format, validation_score: validation.score, created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.warn("[LessonGenerate] Database insert failed", dbError);
    }

    return NextResponse.json({
      success: true,
      lesson,
      metadata: { cached: false, processingTime: Date.now() - startTime, validationScore: validation.score, completeness: completeness.coverage, cacheStats: cache.getStats() },
    });
  } catch (error) {
    console.error("[LessonGenerate] Error:", error);
    return NextResponse.json({ success: false, error: "Lesson generation failed safely. Please try again." }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cache = getCache();
    const stats = cache.getStats();
    return NextResponse.json({ success: true, cache: { ...stats, estimatedTokensSaved: stats.estimatedSavings * 1500, estimatedCostSaved: `$${(stats.estimatedSavings * 0.02).toFixed(2)}` } });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve cache statistics" }, { status: 500 });
  }
}