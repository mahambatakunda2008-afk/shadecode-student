/**
 * /lib/curriculum/coverage.ts
 *
 * Curriculum coverage analysis
 */

import { CurriculumCoverage, StudentProgress, CurriculumTopic, CurriculumGap } from "./types";
import { getZIMSECCurriculum } from "./zimsec";
import { getCambridgeCurriculum } from "./cambridge";

function getCurriculum(studentProgress: StudentProgress) {
  return studentProgress.board === "ZIMSEC"
    ? getZIMSECCurriculum(studentProgress.subject, studentProgress.level)
    : getCambridgeCurriculum(studentProgress.subject, studentProgress.level);
}

export function analyzeCurriculumCoverage(studentProgress: StudentProgress): CurriculumCoverage {
  const { subject, board, level, completedTopics, topicProgress } = studentProgress;
  const topics = getCurriculum(studentProgress).topics;
  const completedTopicIds = new Set(completedTopics);

  let totalWeight = 0;
  let completedWeight = 0;
  for (const topic of topics) {
    totalWeight += topic.weight;
    if (completedTopicIds.has(topic.id)) completedWeight += topic.weight;
  }

  const completedCount = topics.filter((topic) => completedTopicIds.has(topic.id)).length;
  const coveragePercentage = topics.length > 0 ? (completedCount / topics.length) * 100 : 0;
  const weightedCoverage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  const missingTopics = topics.filter((topic) => !completedTopicIds.has(topic.id)).map((topic) => topic.id);
  const curriculumTopicIds = new Set(topics.map((topic) => topic.id));
  const weakTopics = Object.entries(topicProgress)
    .filter(([topicId, progress]) => curriculumTopicIds.has(topicId) && progress.score < 60)
    .map(([topicId]) => topicId);
  const strongTopics = Object.entries(topicProgress)
    .filter(([topicId, progress]) => curriculumTopicIds.has(topicId) && progress.score >= 80)
    .map(([topicId]) => topicId);

  return { subject, board, level, totalTopics: topics.length, completedTopics: completedCount, coveragePercentage, weightedCoverage, missingTopics, weakTopics, strongTopics };
}

export function detectCurriculumGaps(studentProgress: StudentProgress): CurriculumGap[] {
  const { completedTopics, topicProgress } = studentProgress;
  const completed = new Set(completedTopics);
  const topics = getCurriculum(studentProgress).topics;
  const gaps: CurriculumGap[] = [];

  for (const topic of topics) {
    const progress = topicProgress[topic.id];
    if (!completed.has(topic.id)) {
      const severity = topic.examFrequency >= 8 ? "critical" : topic.examFrequency >= 6 ? "high" : topic.examFrequency >= 4 ? "medium" : "low";
      gaps.push({
        topicId: topic.id,
        topic: topic.topic,
        gapType: "missing",
        severity,
        impact: topic.examFrequency,
        recommendedActions: [`Study ${topic.topic}`, `Complete exercises on ${topic.subtopics.join(", ")}`, "Practice past exam questions on this topic"],
        estimatedTimeToComplete: topic.difficulty * 2,
      });
    }
    if (progress && progress.score < 60) {
      const severity = progress.score < 40 ? "critical" : progress.score < 50 ? "high" : "medium";
      gaps.push({
        topicId: topic.id,
        topic: topic.topic,
        gapType: "weak",
        severity,
        impact: topic.examFrequency,
        recommendedActions: [`Review ${topic.topic}`, `Practice more exercises on ${topic.subtopics.join(", ")}`, "Focus on weak areas identified in past attempts"],
        estimatedTimeToComplete: Math.ceil((60 - progress.score) / 10),
      });
    }
  }

  return gaps.sort((a, b) => b.impact - a.impact);
}

export function getTopicPriority(topic: CurriculumTopic, studentProgress: StudentProgress): number {
  const { completedTopics, topicProgress } = studentProgress;
  let priority = topic.examFrequency * 2 + topic.weight;
  const progress = topicProgress[topic.id];
  if (completedTopics.includes(topic.id)) {
    if (progress && progress.score >= 80) priority -= 10;
    else if (progress && progress.score < 60) priority += 5;
  } else if (topic.examFrequency >= 8) priority += 10;
  if (topic.difficulty <= 5 && !completedTopics.includes(topic.id)) priority += 3;
  return priority;
}

export function getRecommendedStudyOrder(studentProgress: StudentProgress): string[] {
  const topics = getCurriculum(studentProgress).topics;
  const remaining = topics.map((topic, index) => ({ topic, index, priority: getTopicPriority(topic, studentProgress) }));
  remaining.sort((a, b) => b.priority - a.priority || a.index - b.index);

  const ordered: string[] = [];
  const added = new Set<string>();
  while (ordered.length < topics.length) {
    const candidate = remaining.find(({ topic }) => !added.has(topic.id) && topic.prerequisites.every((id) => added.has(id)));
    if (!candidate) {
      const fallback = remaining.find(({ topic }) => !added.has(topic.id));
      if (!fallback) break;
      ordered.push(fallback.topic.id);
      added.add(fallback.topic.id);
    } else {
      ordered.push(candidate.topic.id);
      added.add(candidate.topic.id);
    }
  }
  return ordered;
}
