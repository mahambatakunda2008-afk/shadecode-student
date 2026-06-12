/**
 * /lib/analytics/weakAreaDetector.ts
 *
 * Weak Area Detection Engine
 *
 * Analyzes learning data to identify weak areas and provide actionable insights
 */

export interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  weak_areas: string[];
  time_taken: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  subject_id: string;
  title: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface WeakArea {
  topic: string;
  subject: string;
  riskLevel: "high" | "medium" | "low";
  reasons: string[];
  frequency: number;
  lastSeen: string;
  recommendation: string;
}

export interface WeakAreaAnalysis {
  weakAreas: WeakArea[];
  priorityRevisionList: WeakArea[];
  riskIndicators: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
  summary: string;
}

/**
 * Detect weak areas from exam results and lesson data
 */
export function detectWeakAreas(
  examResults: ExamResult[],
  lessons: Lesson[]
): WeakAreaAnalysis {
  const weakAreasMap = new Map<string, WeakArea>();

  // Analyze exam results for weak patterns
  examResults.forEach(exam => {
    // 1. Low quiz scores (< 60%)
    if (exam.score < 60) {
      const topic = exam.topic || exam.subject;
      addWeakArea(
        weakAreasMap,
        topic,
        exam.subject,
        "low_score",
        `Scored ${exam.score}% on ${exam.difficulty} exam`
      );
    }

    // 2. Failed exam questions (from weak_areas field)
    exam.weak_areas.forEach(area => {
      addWeakArea(
        weakAreasMap,
        area,
        exam.subject,
        "failed_question",
        `Identified as weak area in exam result`
      );
    });

    // 3. Repeated mistakes (same topic appearing multiple times)
    if (exam.topic) {
      const topicKey = `${exam.subject}:${exam.topic}`;
      const existing = weakAreasMap.get(topicKey);
      if (existing && existing.frequency >= 2) {
        addReason(existing, "repeated_mistake", `Topic appeared in ${existing.frequency} exams`);
      }
    }
  });

  // 4. Frequently revisited lessons (low progress but many updates)
  const lessonUpdates = new Map<string, number>();
  lessons.forEach(lesson => {
    const key = lesson.subject_id;
    lessonUpdates.set(key, (lessonUpdates.get(key) || 0) + 1);
  });

  lessons.forEach(lesson => {
    if (lesson.progress < 50 && (lessonUpdates.get(lesson.subject_id) || 0) > 3) {
      addWeakArea(
        weakAreasMap,
        lesson.title,
        lesson.subject_id,
        "revisited_lesson",
        "Lesson revisited multiple times with low completion"
      );
    }
  });

  // 5. Abandoned lessons (started but not completed for > 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  lessons.forEach(lesson => {
    const createdAt = new Date(lesson.created_at);
    if (lesson.progress > 0 && lesson.progress < 100 && createdAt < sevenDaysAgo) {
      addWeakArea(
        weakAreasMap,
        lesson.title,
        lesson.subject_id,
        "abandoned_lesson",
        `Started ${Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))} days ago, not completed`
      );
    }
  });

  // Calculate risk levels and recommendations
  const weakAreas = Array.from(weakAreasMap.values());
  weakAreas.forEach(area => {
    area.riskLevel = calculateRiskLevel(area);
    area.recommendation = generateRecommendation(area);
  });

  // Sort by risk level and frequency
  const sortedWeakAreas = weakAreas.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.frequency - a.frequency;
  });

  // Calculate risk indicators
  const riskIndicators = {
    highRisk: sortedWeakAreas.filter(a => a.riskLevel === "high").length,
    mediumRisk: sortedWeakAreas.filter(a => a.riskLevel === "medium").length,
    lowRisk: sortedWeakAreas.filter(a => a.riskLevel === "low").length,
  };

  // Generate summary
  const summary = generateSummary(sortedWeakAreas, riskIndicators);

  return {
    weakAreas: sortedWeakAreas,
    priorityRevisionList: sortedWeakAreas.slice(0, 5),
    riskIndicators,
    summary,
  };
}

function addWeakArea(
  map: Map<string, WeakArea>,
  topic: string,
  subject: string,
  reasonType: string,
  reasonText: string
): void {
  const key = `${subject}:${topic}`;
  const existing = map.get(key);

  if (existing) {
    existing.frequency++;
    addReason(existing, reasonType, reasonText);
    if (new Date(reasonText) > new Date(existing.lastSeen)) {
      existing.lastSeen = reasonText;
    }
  } else {
    map.set(key, {
      topic,
      subject,
      riskLevel: "low",
      reasons: [`${reasonType}: ${reasonText}`],
      frequency: 1,
      lastSeen: new Date().toISOString(),
      recommendation: "",
    });
  }
}

function addReason(area: WeakArea, reasonType: string, reasonText: string): void {
  const reason = `${reasonType}: ${reasonText}`;
  if (!area.reasons.includes(reason)) {
    area.reasons.push(reason);
  }
}

function calculateRiskLevel(area: WeakArea): "high" | "medium" | "low" {
  let riskScore = 0;

  // Frequency contributes to risk
  riskScore += Math.min(area.frequency * 10, 30);

  // Reason types contribute to risk
  area.reasons.forEach(reason => {
    if (reason.includes("low_score")) riskScore += 20;
    if (reason.includes("failed_question")) riskScore += 15;
    if (reason.includes("repeated_mistake")) riskScore += 25;
    if (reason.includes("abandoned_lesson")) riskScore += 10;
    if (reason.includes("revisited_lesson")) riskScore += 15;
  });

  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  if (riskScore >= 60) return "high";
  if (riskScore >= 30) return "medium";
  return "low";
}

function generateRecommendation(area: WeakArea): string {
  const hasLowScore = area.reasons.some(r => r.includes("low_score"));
  const hasFailedQuestion = area.reasons.some(r => r.includes("failed_question"));
  const hasRepeatedMistake = area.reasons.some(r => r.includes("repeated_mistake"));
  const hasAbandonedLesson = area.reasons.some(r => r.includes("abandoned_lesson"));

  if (hasRepeatedMistake && hasLowScore) {
    return `Review fundamentals of ${area.topic} and practice with easier problems before attempting harder ones.`;
  }

  if (hasFailedQuestion) {
    return `Focus on ${area.topic} - identify specific concepts you're struggling with and target those.`;
  }

  if (hasAbandonedLesson) {
    return `Return to ${area.topic} - break it into smaller chunks and complete one section at a time.`;
  }

  if (hasLowScore) {
    return `Spend extra time on ${area.topic} - review notes and attempt practice problems.`;
  }

  return `Practice ${area.topic} regularly to strengthen your understanding.`;
}

function generateSummary(
  weakAreas: WeakArea[],
  riskIndicators: { highRisk: number; mediumRisk: number; lowRisk: number }
): string {
  if (weakAreas.length === 0) {
    return "No weak areas detected. Keep up the great work!";
  }

  const total = weakAreas.length;
  const highRisk = riskIndicators.highRisk;
  const mediumRisk = riskIndicators.mediumRisk;

  if (highRisk > 0) {
    return `Found ${total} area${total > 1 ? "s" : ""} needing attention, with ${highRisk} high-priority topic${highRisk > 1 ? "s" : ""} requiring immediate focus.`;
  }

  if (mediumRisk > 0) {
    return `Found ${total} area${total > 1 ? "s" : ""} for improvement, with ${mediumRisk} topic${mediumRisk > 1 ? "s" : ""} that would benefit from review.`;
  }

  return `Found ${total} minor area${total > 1 ? "s" : ""} to strengthen. Regular practice will help consolidate your learning.`;
}
