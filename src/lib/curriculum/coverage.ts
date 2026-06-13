/**
 * /lib/curriculum/coverage.ts
 *
 * Curriculum coverage analysis
 */

import { CurriculumCoverage, StudentProgress, TopicProgress, CurriculumTopic, CurriculumGap } from "./types";
import { getZIMSECCurriculum } from "./zimsec";
import { getCambridgeCurriculum } from "./cambridge";

export function analyzeCurriculumCoverage(
  studentProgress: StudentProgress
): CurriculumCoverage {
  const { subject, board, level, completedTopics, topicProgress } = studentProgress;
  
  // Get curriculum for the subject, board, and level
  const curriculum = board === "ZIMSEC" 
    ? getZIMSECCurriculum(subject, level)
    : getCambridgeCurriculum(subject, level);
  
  const topics = curriculum.topics;
  const totalTopics = topics.length;
  const completedTopicIds = completedTopics;
  
  // Calculate basic coverage
  const completedCount = completedTopicIds.length;
  const coveragePercentage = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;
  
  // Calculate weighted coverage (weighted by topic importance)
  let totalWeight = 0;
  let completedWeight = 0;
  
  topics.forEach(topic => {
    totalWeight += topic.weight;
    if (completedTopicIds.includes(topic.id)) {
      completedWeight += topic.weight;
    }
  });
  
  const weightedCoverage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  
  // Identify missing topics
  const missingTopics = topics
    .filter(topic => !completedTopicIds.includes(topic.id))
    .map(topic => topic.id);
  
  // Identify weak topics (score < 60)
  const weakTopics = Object.entries(topicProgress)
    .filter(([_, progress]) => progress.score < 60)
    .map(([topicId, _]) => topicId);
  
  // Identify strong topics (score >= 80)
  const strongTopics = Object.entries(topicProgress)
    .filter(([_, progress]) => progress.score >= 80)
    .map(([topicId, _]) => topicId);
  
  return {
    subject,
    board,
    level,
    totalTopics,
    completedTopics: completedCount,
    coveragePercentage,
    weightedCoverage,
    missingTopics,
    weakTopics,
    strongTopics,
  };
}

export function detectCurriculumGaps(
  studentProgress: StudentProgress
): CurriculumGap[] {
  const { subject, board, level, completedTopics, topicProgress } = studentProgress;
  
  const curriculum = board === "ZIMSEC" 
    ? getZIMSECCurriculum(subject, level)
    : getCambridgeCurriculum(subject, level);
  
  const topics = curriculum.topics;
  const gaps: CurriculumGap[] = [];
  
  topics.forEach(topic => {
    const isCompleted = completedTopics.includes(topic.id);
    const progress = topicProgress[topic.id];
    
    // Check for missing topics
    if (!isCompleted) {
      const severity = topic.examFrequency >= 8 ? "critical" :
                      topic.examFrequency >= 6 ? "high" :
                      topic.examFrequency >= 4 ? "medium" : "low";
      
      gaps.push({
        topicId: topic.id,
        topic: topic.topic,
        gapType: "missing",
        severity,
        impact: topic.examFrequency,
        recommendedActions: [
          `Study ${topic.topic}`,
          `Complete exercises on ${topic.subtopics.join(", ")}`,
          `Practice past exam questions on this topic`,
        ],
        estimatedTimeToComplete: topic.difficulty * 2, // Estimate 2 hours per difficulty point
      });
    }
    
    // Check for weak topics
    if (progress && progress.score < 60) {
      const severity = progress.score < 40 ? "critical" :
                      progress.score < 50 ? "high" : "medium";
      
      gaps.push({
        topicId: topic.id,
        topic: topic.topic,
        gapType: "weak",
        severity,
        impact: topic.examFrequency,
        recommendedActions: [
          `Review ${topic.topic}`,
          `Practice more exercises on ${topic.subtopics.join(", ")}`,
          `Focus on weak areas identified in past attempts`,
        ],
        estimatedTimeToComplete: Math.ceil((60 - progress.score) / 10), // Estimate based on score gap
      });
    }
  });
  
  // Sort gaps by impact (highest first)
  gaps.sort((a, b) => b.impact - a.impact);
  
  return gaps;
}

export function getTopicPriority(topic: CurriculumTopic, studentProgress: StudentProgress): number {
  const { completedTopics, topicProgress } = studentProgress;
  
  let priority = 0;
  
  // Base priority from exam frequency
  priority += topic.examFrequency * 2;
  
  // Add weight for importance
  priority += topic.weight;
  
  // Subtract if already completed (but not too much if weak)
  if (completedTopics.includes(topic.id)) {
    const progress = topicProgress[topic.id];
    if (progress && progress.score >= 80) {
      priority -= 10; // Reduce priority for strong topics
    } else if (progress && progress.score < 60) {
      priority += 5; // Increase priority for weak completed topics
    }
  } else {
    // Increase priority for missing high-frequency topics
    if (topic.examFrequency >= 8) {
      priority += 10;
    }
  }
  
  // Consider difficulty - easier topics get slight priority boost for quick wins
  if (topic.difficulty <= 5 && !completedTopics.includes(topic.id)) {
    priority += 3;
  }
  
  return priority;
}

export function getRecommendedStudyOrder(
  studentProgress: StudentProgress
): string[] {
  const { subject, board, level } = studentProgress;
  
  const curriculum = board === "ZIMSEC" 
    ? getZIMSECCurriculum(subject, level)
    : getCambridgeCurriculum(subject, level);
  
  const topics = curriculum.topics;
  
  // Calculate priority for each topic
  const topicsWithPriority = topics.map(topic => ({
    topic,
    priority: getTopicPriority(topic, studentProgress),
  }));
  
  // Sort by priority (highest first)
  topicsWithPriority.sort((a, b) => b.priority - a.priority);
  
  // Check prerequisites - ensure prerequisites come before dependent topics
  const orderedTopics: string[] = [];
  const addedTopics = new Set<string>();
  
  while (orderedTopics.length < topics.length) {
    let added = false;
    
    for (const { topic } of topicsWithPriority) {
      if (addedTopics.has(topic.id)) continue;
      
      // Check if all prerequisites are satisfied
      const prerequisitesSatisfied = topic.prerequisites.every(prereqId => 
        addedTopics.has(prereqId) || studentProgress.completedTopics.includes(prereqId)
      );
      
      if (prerequisitesSatisfied) {
        orderedTopics.push(topic.id);
        addedTopics.add(topic.id);
        added = true;
        break;
      }
    }
    
    if (!added) {
      // If no topic can be added (circular dependency or missing prerequisite), add the highest priority remaining
      const remaining = topicsWithPriority.filter(({ topic }) => !addedTopics.has(topic.id));
      if (remaining.length > 0) {
        orderedTopics.push(remaining[0].topic.id);
        addedTopics.add(remaining[0].topic.id);
      }
    }
  }
  
  return orderedTopics;
}
