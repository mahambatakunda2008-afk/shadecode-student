/**
 * Phase 2: Lesson Generation Endpoint
 * POST /api/learn/generate-lesson
 *
 * Generates complete lessons aligned to curriculum standards
 * Integrates Phase 1 caching, validation, and Phase 2 generation
 *
 * Request:
 *   - subject: string (e.g., "Mathematics", "English", "Science")
 *   - topic: string (e.g., "Quadratic Equations", "Fractions")
 *   - level: "beginner" | "intermediate" | "advanced"
 *   - format?: "quick" | "full" | "deep" (default: "full")
 *   - style?: "visual" | "analytical" | "practical" (default: "practical")
 *   - curriculum?: "ZIMSEC" | "Cambridge" | "generic" (default: "ZIMSEC")
 *
 * Response:
 *   - success: boolean
 *   - lesson?: GeneratedLesson
 *   - error?: string
 *   - cacheHit?: boolean
 *   - timeTaken: number (milliseconds)
 *   - engagementId?: string (for tracking)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { LessonGenerator, type LessonGenerationRequest } from "@/lib/learn/lesson-generator";
import { ContentBuilder } from "@/lib/learn/contentBuilder";
import { validateLessonStructure } from "@/lib/cortex/validators";
import { log } from "@/lib/observability";

// Database types (would be generated from Supabase schema)
interface GeneratedLessonsRow {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  title: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  validation_score: number;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

interface LessonEngagementRow {
  id: string;
  user_id: string;
  lesson_id: string;
  time_spent_seconds: number;
  sections_completed: number;
  rating: number | null;
  created_at: string;
}

// Get authenticated user
function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function getAuthUser(token: string, supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * POST /api/learn/generate-lesson
 * Generate a new lesson
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const user = await getAuthUser(token, supabase);

    // Parse request body
    const body = await request.json();
    const lessonRequest: LessonGenerationRequest = {
      subject: body.subject,
      topic: body.topic,
      level: body.level || "intermediate",
      format: body.format || "full",
      style: body.style || "practical",
      curriculum: body.curriculum || "ZIMSEC",
      userId: user.id,
    };

    // Validate input
    if (!lessonRequest.subject || !lessonRequest.topic) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: subject, topic",
        },
        { status: 400 }
      );
    }

    // Generate lesson
    const generator = new LessonGenerator(global.cortexEngine || {});
    const response = await generator.generateLesson(lessonRequest);

    if (!response.success || !response.lesson) {
      log.error("Lesson generation failed", {
        error: response.error,
        request: lessonRequest,
      });

      return NextResponse.json(
        { success: false, error: response.error || "Generation failed" },
        { status: 500 }
      );
    }

    // Save lesson to database
    const lessonRow: GeneratedLessonsRow = {
      id: response.lesson.id,
      user_id: user.id,
      subject_id: lessonRequest.subject.toLowerCase(),
      topic_id: lessonRequest.topic.toLowerCase(),
      title: response.lesson.title,
      content: response.lesson.content,
      metadata: response.lesson.metadata,
      validation_score: response.lesson.metadata.validationScore,
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from("generated_lessons")
      .insert([lessonRow]);

    if (dbError) {
      log.warn("Failed to save lesson to database", { error: dbError });
      // Don't fail the request - lesson is still valid, just not persisted
    }

    // Create engagement record for tracking
    const engagementRow: LessonEngagementRow = {
      id: `eng-${Date.now()}`,
      user_id: user.id,
      lesson_id: response.lesson.id,
      time_spent_seconds: 0,
      sections_completed: 0,
      rating: null,
      created_at: new Date().toISOString(),
    };

    const { error: engError } = await supabase
      .from("lesson_engagement")
      .insert([engagementRow]);

    if (engError) {
      log.warn("Failed to create engagement record", { error: engError });
    }

    // Enrich lesson with multimedia (optional)
    const contentBuilder = new ContentBuilder();
    const enrichedLesson = await contentBuilder.enrichLesson(response.lesson, {
      includeVideos: true,
      includeCodeExamples: true,
      includeMath: true,
      includeInteractives: body.interactive !== false,
    });

    log.info("Lesson generated successfully", {
      lessonId: response.lesson.id,
      subject: lessonRequest.subject,
      topic: lessonRequest.topic,
      cacheHit: response.cacheHit,
      timeTaken: response.timeTaken,
      validationScore: response.lesson.metadata.validationScore,
    });

    return NextResponse.json({
      success: true,
      lesson: enrichedLesson,
      cacheHit: response.cacheHit,
      timeTaken: response.timeTaken,
      engagementId: engagementRow.id,
    });
  } catch (error) {
    log.error("Lesson generation endpoint error", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/learn/generate-lesson
 * Get cache statistics and generation metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const user = await getAuthUser(token, supabase);

    // Get cache stats
    const generator = new LessonGenerator(global.cortexEngine || {});
    const stats = generator.getCacheStats();

    // Get user's recent lessons
    const { data: recentLessons, error } = await supabase
      .from("generated_lessons")
      .select("id, title, subject_id, topic_id, validation_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      log.warn("Failed to fetch user lessons", { error });
    }

    // Get engagement metrics
    const { data: engagements, error: engError } = await supabase
      .from("lesson_engagement")
      .select("lesson_id, time_spent_seconds, rating")
      .eq("user_id", user.id)
      .limit(100);

    if (engError) {
      log.warn("Failed to fetch engagement data", { error: engError });
    }

    // Calculate metrics
    const totalTimeSpent = (engagements || []).reduce(
      (sum, e) => sum + (e.time_spent_seconds || 0),
      0
    );
    const averageRating =
      engagements && engagements.length > 0
        ? (engagements as any[])
            .filter((e) => e.rating)
            .reduce((sum, e) => sum + (e.rating || 0), 0) / engagements.length
        : 0;

    return NextResponse.json({
      success: true,
      cacheStats: stats,
      userMetrics: {
        lessonsGenerated: recentLessons?.length || 0,
        totalTimeSpentSeconds: totalTimeSpent,
        averageRating: Math.round(averageRating * 10) / 10,
      },
      recentLessons: recentLessons || [],
    });
  } catch (error) {
    log.error("Failed to get statistics", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Declare global cortex engine
 * This would be injected at startup
 */
declare global {
  var cortexEngine: any;
}
