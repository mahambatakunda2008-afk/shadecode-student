/**
 * /lib/student-intelligence/services/weakAreas.ts
 *
 * Shared weak-area computation. Extracted from intelligence.ts so both
 * intelligence.ts (dashboard display) and intelligence-integration.ts
 * (recommendation engine input) compute this the same way instead of
 * each maintaining their own copy -- intelligence.ts already imports
 * from intelligence-integration.ts, so a direct import the other way
 * would be circular.
 */

import { getMemory } from "@/lib/cortex/memory";
import { createClient } from "@/lib/supabase/client";
import { performanceService } from "./performance";
import { rankByRetentionRisk, type TopicMasteryInput } from "@/lib/cortex/retentionRisk";

export interface WeakAreaResult {
  topicId: string;
  topic: string;
  subject: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  lastAssessed: string;
  recommendedActions: string[];
  estimatedTimeToImprove: number;
  /** 0-100. From src/lib/cortex/retentionRisk.ts when a topic_mastery row exists for this topic. */
  retentionRisk?: number;
  retentionReason?: string;
}

function riskToSeverity(riskScore: number): WeakAreaResult["severity"] {
  if (riskScore >= 80) return "critical";
  if (riskScore >= 60) return "high";
  if (riskScore >= 40) return "medium";
  return "low";
}

/**
 * Build the weak-areas list for a user, using real per-subject exam
 * performance to compute an actual score instead of a hardcoded 0.
 */
export async function computeWeakAreas(userId: string): Promise<WeakAreaResult[]> {
  const cortexMemory = await getMemory(userId);
  const weakAreas: WeakAreaResult[] = [];

  const exams = await performanceService.getExamPerformance(userId);
  const subjectAverages = new Map<string, number>();
  exams.forEach((exam) => {
    const key = exam.subject.toLowerCase();
    const existing = subjectAverages.get(key);
    subjectAverages.set(key, existing !== undefined ? (existing + exam.percentage) / 2 : exam.percentage);
  });

  const overallAverage = exams.length > 0
    ? Math.round(exams.reduce((s, e) => s + e.percentage, 0) / exams.length)
    : 0;

  (cortexMemory.weakTopics || []).forEach((topic, index) => {
    // Best-effort subject match: the exam's subject field is the full
    // subject name (e.g. "Mathematics"), while a weak topic string might
    // be a specific concept within it (e.g. "Mathematics: Quadratic
    // Equations") -- match on substring in either direction rather than
    // requiring an exact match.
    const matchedSubject = [...subjectAverages.keys()].find(
      (subj) => topic.toLowerCase().includes(subj) || subj.includes(topic.toLowerCase())
    );
    const matchedExam = matchedSubject ? exams.find((e) => e.subject.toLowerCase() === matchedSubject) : undefined;

    weakAreas.push({
      topicId: crypto.randomUUID(),
      topic,
      subject: matchedExam?.subject ?? "General",
      severity: index < 2 ? "critical" : index < 4 ? "high" : "medium",
      // 0 would misleadingly read as "you're scoring zero on this topic"
      // -- when there's no matching exam data, fall back to the overall
      // average (still real, not fabricated) rather than a fake floor.
      score: matchedSubject ? Math.round(subjectAverages.get(matchedSubject)!) : overallAverage,
      // Placeholder until matched against real topic_mastery.last_attempted
      // below -- was previously always "now" for every topic regardless
      // of when it was actually last assessed.
      lastAssessed: new Date().toISOString(),
      recommendedActions: [
        "Review fundamentals",
        "Practice exercises",
        "Take quiz",
      ],
      estimatedTimeToImprove: 60,
    });
  });

  // Retention Risk (Priority Engine Factor 4). topic_mastery is written
  // by src/app/api/exam/mark/route.js after each marked exam -- until
  // this function, nothing ever read it back. Two things happen here:
  // (1) enrich existing weak areas with a real retentionRisk score and
  // the REAL last-assessed date instead of "now", and (2) surface topics
  // that are quietly decaying but were never flagged by cortexMemory's
  // simpler weakTopics list at all -- the actual new capability, not
  // just enrichment of what already existed.
  try {
    const supabase = createClient();
    const { data: masteryRows, error: masteryError } = await supabase
      .from("topic_mastery")
      .select("subject, topic, mastery_score, last_attempted, trend")
      .eq("user_id", userId);

    if (!masteryError && masteryRows && masteryRows.length > 0) {
      const ranked = rankByRetentionRisk(masteryRows as TopicMasteryInput[]);

      ranked.forEach((risk) => {
        const matched = weakAreas.find(
          (w) =>
            w.topic.toLowerCase().includes(risk.topic.toLowerCase()) ||
            risk.topic.toLowerCase().includes(w.topic.toLowerCase())
        );

        if (matched) {
          matched.retentionRisk = risk.riskScore;
          matched.retentionReason = risk.reason;
          matched.lastAssessed = masteryRows.find(
            (r) => r.topic === risk.topic && r.subject === risk.subject
          )?.last_attempted ?? matched.lastAssessed;
        } else if (risk.isAtRisk) {
          weakAreas.push({
            topicId: crypto.randomUUID(),
            topic: risk.topic,
            subject: risk.subject,
            severity: riskToSeverity(risk.riskScore),
            score: masteryRows.find((r) => r.topic === risk.topic && r.subject === risk.subject)?.mastery_score ?? overallAverage,
            lastAssessed: masteryRows.find((r) => r.topic === risk.topic && r.subject === risk.subject)?.last_attempted ?? new Date().toISOString(),
            recommendedActions: ["Review this topic before it fades further"],
            estimatedTimeToImprove: 30,
            retentionRisk: risk.riskScore,
            retentionReason: risk.reason,
          });
        }
      });
    }
  } catch (err) {
    // Never let a retention-risk enrichment failure break the whole
    // weak-areas computation -- the cortexMemory-derived list above is
    // still valid and useful on its own.
    console.error("[weakAreas] retention risk enrichment failed:", err);
  }

  return weakAreas;
}
