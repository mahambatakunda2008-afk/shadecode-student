/**
 * /lib/cortex/memory.ts
 *
 * Cortex Memory: Fast in-memory interaction cache
 *
 * Responsibility:
 * - Store user interactions (question → answer)
 * - Fast retrieval with partial matching
 * - Automatic cleanup and memory optimization
 *
 * Design:
 * - In-memory array storage (NO database required)
 * - Similarity-based search (not exact match only)
 * - Per-user memory isolation
 * - Configurable size limits
 */

/**
 * Single memory entry
 */
export interface MemoryEntry {
  userId: string;
  question: string;
  answer: string;
  timestamp: string;
  similarity?: number; // Used during search results
}

/**
 * Memory statistics for debugging
 */
export interface MemoryStats {
  totalEntries: number;
  userCount: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  entriesByUser: Record<string, number>;
}

/**
 * CortexMemory: In-memory interaction cache with similarity search
 *
 * Storage strategy:
 * - Single array of entries (simple, fast)
 * - Per-user querying
 * - Automatic trimming (keeps last N entries)
 * - Similarity scoring for partial matching
 */
export class CortexMemory {
  private entries: MemoryEntry[] = [];
  private readonly MAX_ENTRIES = 1000; // Total memory limit
  private readonly MAX_PER_USER = 50; // Per-user limit
  private readonly SIMILARITY_THRESHOLD = 0.4; // 40% match minimum

  /**
   * Save interaction to memory
   *
   * @param userId - User identifier
   * @param question - User question
   * @param answer - Generated answer
   */
  save(userId: string, question: string, answer: string): void {
    // Validate inputs
    if (!userId || !question || !answer) {
      return;
    }

    const sanitizedQuestion = question.trim();
    const sanitizedAnswer = answer.trim();

    // Check if similar question already exists (avoid duplicates)
    const existing = this.entries.find(
      (entry) =>
        entry.userId === userId &&
        this.calculateSimilarity(sanitizedQuestion, entry.question) > 0.9
    );

    if (existing) {
      // Update timestamp but keep original answer for consistency
      existing.timestamp = new Date().toISOString();
      return;
    }

    // Create new entry
    const entry: MemoryEntry = {
      userId,
      question: sanitizedQuestion,
      answer: sanitizedAnswer,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(entry);

    // Cleanup if needed
    this.cleanup();
  }

  /**
   * Retrieve answer from memory (fast lookup)
   *
   * Search strategy:
   * 1. Check for similar questions from same user
   * 2. Return best match if similarity > threshold
   * 3. Return null if no good match found
   *
   * @param userId - User identifier
   * @param question - User question
   * @returns Cached answer or null
   */
  retrieve(userId: string, question: string): string | null {
    const sanitizedQuestion = question.trim();
    const userEntries = this.entries.filter((entry) => entry.userId === userId);

    if (userEntries.length === 0) {
      return null;
    }

    // Calculate similarity for all user entries
    const scored = userEntries.map((entry) => ({
      ...entry,
      similarity: this.calculateSimilarity(sanitizedQuestion, entry.question),
    }));

    // Sort by similarity (descending)
    scored.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    const bestMatch = scored[0];

    // Return if similarity exceeds threshold
    if (bestMatch && bestMatch.similarity && bestMatch.similarity >= this.SIMILARITY_THRESHOLD) {
      return bestMatch.answer;
    }

    return null;
  }

  /**
   * Search memory for similar questions
   *
   * @param question - Search query
   * @param userId - Optional: filter by user
   * @param limit - Max results to return
   * @returns Array of similar entries sorted by relevance
   */
  search(question: string, userId?: string, limit: number = 5): MemoryEntry[] {
    const sanitizedQuestion = question.trim();

    let results = this.entries;

    // Filter by user if provided
    if (userId) {
      results = results.filter((entry) => entry.userId === userId);
    }

    // Score and filter
    const scored = results
      .map((entry) => ({
        ...entry,
        similarity: this.calculateSimilarity(sanitizedQuestion, entry.question),
      }))
      .filter((entry) => entry.similarity >= this.SIMILARITY_THRESHOLD)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return scored;
  }

  /**
   * Calculate similarity between two strings (0.0 to 1.0)
   *
   * Algorithm: Normalized Levenshtein distance with keyword matching
   *
   * Scoring:
   * - Exact match: 1.0
   * - Keyword overlap: 0.5 - 0.9
   * - Levenshtein distance: 0.0 - 1.0
   * - Final: weighted average
   *
   * @param a - First string
   * @param b - Second string
   * @returns Similarity score (0.0 - 1.0)
   */
  private calculateSimilarity(a: string, b: string): number {
    const str1 = a.toLowerCase();
    const str2 = b.toLowerCase();

    // Exact match
    if (str1 === str2) {
      return 1.0;
    }

    // Extract keywords (remove common words)
    const keywords1 = this.extractKeywords(str1);
    const keywords2 = this.extractKeywords(str2);

    // Keyword overlap score
    const keywordScore = this.calculateKeywordOverlap(keywords1, keywords2);

    // Levenshtein distance score
    const levenScore = 1 - this.normalizedLevenDistance(str1, str2);

    // Weighted average: 60% keywords, 40% Levenshtein
    return keywordScore * 0.6 + levenScore * 0.4;
  }

  /**
   * Extract significant keywords from text
   * Removes common stop words
   *
   * @param text - Input text
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    return text
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word))
      .slice(0, 10); // Limit to first 10 keywords
  }

  /**
   * Calculate keyword overlap score (0.0 to 1.0)
   *
   * @param keywords1 - First set of keywords
   * @param keywords2 - Second set of keywords
   * @returns Overlap score
   */
  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = [...set1].filter((kw) => set2.has(kw)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union; // Jaccard similarity
  }

  /**
   * Normalized Levenshtein distance (0.0 to 1.0)
   * Lower = more similar
   *
   * @param a - First string
   * @param b - Second string
   * @returns Distance (0.0 = identical, 1.0 = completely different)
   */
  private normalizedLevenDistance(a: string, b: string): number {
    const distance = this.levenDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 0 : distance / maxLength;
  }

  /**
   * Levenshtein distance (edit distance)
   * Number of single-character edits needed
   *
   * @param a - First string
   * @param b - Second string
   * @returns Edit distance
   */
  private levenDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Substitution
            matrix[i][j - 1] + 1, // Insertion
            matrix[i - 1][j] + 1 // Deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Cleanup: Remove old entries if storage limits exceeded
   *
   * Strategy:
   * - Remove oldest entries globally if > MAX_ENTRIES
   * - Remove oldest per-user if user > MAX_PER_USER
   */
  private cleanup(): void {
    // Global limit
    if (this.entries.length > this.MAX_ENTRIES) {
      const toRemove = this.entries.length - this.MAX_ENTRIES;
      this.entries = this.entries.slice(toRemove);
    }

    // Per-user limit
    const userGroups = new Map<string, MemoryEntry[]>();
    for (const entry of this.entries) {
      if (!userGroups.has(entry.userId)) {
        userGroups.set(entry.userId, []);
      }
      userGroups.get(entry.userId)!.push(entry);
    }

    for (const [userId, userEntries] of userGroups) {
      if (userEntries.length > this.MAX_PER_USER) {
        const toRemove = userEntries.length - this.MAX_PER_USER;
        const idsToRemove = new Set(userEntries.slice(0, toRemove).map((e) => e.timestamp));

        this.entries = this.entries.filter((e) => !idsToRemove.has(e.timestamp));
      }
    }
  }

  /**
   * Get memory statistics
   *
   * @returns Memory stats object
   */
  getStats(): MemoryStats {
    const entriesByUser: Record<string, number> = {};

    for (const entry of this.entries) {
      entriesByUser[entry.userId] = (entriesByUser[entry.userId] || 0) + 1;
    }

    const timestamps = this.entries.map((e) => e.timestamp).sort();

    return {
      totalEntries: this.entries.length,
      userCount: Object.keys(entriesByUser).length,
      oldestEntry: timestamps[0] || null,
      newestEntry: timestamps[timestamps.length - 1] || null,
      entriesByUser,
    };
  }

  /**
   * Clear all memory for a user
   *
   * @param userId - User to clear
   */
  clearUser(userId: string): void {
    this.entries = this.entries.filter((e) => e.userId !== userId);
  }

  /**
   * Clear all memory (testing/reset)
   */
  clearAll(): void {
    this.entries = [];
  }
}

/* ───────────────────────────────────────────────────────────────────────────
   Per-user Cortex memory (persistent learning state)

   CortexCore (lib/cortex/core.ts) reads/writes a small per-user state object
   while routing learn/practice/feedback intents. This is now backed by the
   cortex_memory table in Supabase for persistent long-term learning patterns.
─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@/lib/supabase/client";

export interface CortexUserMemory {
  level: number;
  streak: number;
  xp: number;
  totalTasks: number;
  completedTasks: number;
  subjects: string[];
  weakTopics: string[];
  weakSubjects?: string[];
  lastTopic?: string;
  lastScore?: number;
  feedback?: unknown;
  
  // Extended persistent memory fields
  frequentlyStudiedSubjects?: string[];
  strongSubjects?: string[];
  preferredStudyHours?: number[];
  averageSessionDuration?: number;
  totalStudySessions?: number;
  examScores?: Array<{ score: number; subject: string; date: string }>;
  averageExamScore?: number;
  longestStreak?: number;
  totalLessonsCompleted?: number;
  totalStudyTimeMinutes?: number;
  lastStudyDate?: string;
  learningInsight?: string;
  recommendationInsight?: string;
  /** ISO week key ("2026-W33") of the last streak-freeze use, if any. */
  streakFreezeWeek?: string;
}

const DEFAULT_USER_MEMORY: CortexUserMemory = {
  level: 1,
  streak: 0,
  xp: 0,
  totalTasks: 0,
  completedTasks: 0,
  subjects: [],
  weakTopics: [],
  frequentlyStudiedSubjects: [],
  strongSubjects: [],
  preferredStudyHours: [],
  averageSessionDuration: 0,
  totalStudySessions: 0,
  examScores: [],
  averageExamScore: 0,
  longestStreak: 0,
  totalLessonsCompleted: 0,
  totalStudyTimeMinutes: 0,
};

export async function getMemory(userId: string): Promise<CortexUserMemory> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cortex_memory")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Return default if no record exists
      return { ...DEFAULT_USER_MEMORY };
    }

    // Map database fields to memory interface
    return {
      level: (data as any).level ?? DEFAULT_USER_MEMORY.level,
      streak: (data as any).current_streak ?? DEFAULT_USER_MEMORY.streak,
      xp: 0, // XP is stored in user_profiles, not cortex_memory
      totalTasks: 0, // Tasks are stored elsewhere
      completedTasks: (data as any).total_lessons_completed ?? 0,
      subjects: (data as any).frequently_studied_subjects ?? [],
      weakTopics: (data as any).weak_subjects ?? [],
      lastTopic: undefined,
      lastScore: (data as any).average_exam_score ?? undefined,
      feedback: undefined,
      frequentlyStudiedSubjects: (data as any).frequently_studied_subjects ?? [],
      strongSubjects: (data as any).strong_subjects ?? [],
      preferredStudyHours: (data as any).preferred_study_hours ?? [],
      averageSessionDuration: (data as any).average_session_duration_minutes ?? 0,
      totalStudySessions: (data as any).total_study_sessions ?? 0,
      examScores: (data as any).exam_scores ?? [],
      averageExamScore: (data as any).average_exam_score ?? 0,
      longestStreak: (data as any).longest_streak ?? 0,
      totalLessonsCompleted: (data as any).total_lessons_completed ?? 0,
      totalStudyTimeMinutes: (data as any).total_study_time_minutes ?? 0,
      lastStudyDate: (data as any).last_study_date ?? undefined,
      learningInsight: (data as any).learning_insight ?? undefined,
      recommendationInsight: (data as any).recommendation_insight ?? undefined,
      streakFreezeWeek: (data as any).streak_freeze_week ?? undefined,
    };
  } catch (err) {
    console.error("[cortex memory] failed to get memory:", err);
    return { ...DEFAULT_USER_MEMORY };
  }
}

export async function updateMemory(
  userId: string,
  patch: Partial<CortexUserMemory>
): Promise<CortexUserMemory> {
  try {
    const supabase = createClient();
    
    // Build update object mapping interface to database columns
    const updateData: any = {};
    
    if (patch.level !== undefined) updateData.level = patch.level;
    if (patch.streak !== undefined) updateData.current_streak = patch.streak;
    if (patch.subjects !== undefined) updateData.frequently_studied_subjects = patch.subjects;
    if (patch.weakTopics !== undefined) updateData.weak_subjects = patch.weakTopics;
    if (patch.frequentlyStudiedSubjects !== undefined) updateData.frequently_studied_subjects = patch.frequentlyStudiedSubjects;
    if (patch.strongSubjects !== undefined) updateData.strong_subjects = patch.strongSubjects;
    if (patch.preferredStudyHours !== undefined) updateData.preferred_study_hours = patch.preferredStudyHours;
    if (patch.averageSessionDuration !== undefined) updateData.average_session_duration_minutes = patch.averageSessionDuration;
    if (patch.totalStudySessions !== undefined) updateData.total_study_sessions = patch.totalStudySessions;
    if (patch.examScores !== undefined) updateData.exam_scores = patch.examScores;
    if (patch.averageExamScore !== undefined) updateData.average_exam_score = patch.averageExamScore;
    if (patch.longestStreak !== undefined) updateData.longest_streak = patch.longestStreak;
    if (patch.totalLessonsCompleted !== undefined) updateData.total_lessons_completed = patch.totalLessonsCompleted;
    if (patch.totalStudyTimeMinutes !== undefined) updateData.total_study_time_minutes = patch.totalStudyTimeMinutes;
    if (patch.lastStudyDate !== undefined) updateData.last_study_date = patch.lastStudyDate;
    if (patch.learningInsight !== undefined) updateData.learning_insight = patch.learningInsight;
    if (patch.recommendationInsight !== undefined) updateData.recommendation_insight = patch.recommendationInsight;
    if (patch.streakFreezeWeek !== undefined) updateData.streak_freeze_week = patch.streakFreezeWeek;

    // Try upsert (update if exists, insert if not)
    const { data, error } = await supabase
      .from("cortex_memory")
      .upsert({
        user_id: userId,
        ...updateData,
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (error) {
      console.error("[cortex memory] failed to update memory:", error);
      // Return current memory even if update fails
      return await getMemory(userId);
    }

    return await getMemory(userId);
  } catch (err) {
    console.error("[cortex memory] failed to update memory:", err);
    return await getMemory(userId);
  }
}
