/**
 * /lib/curriculum/readiness.ts
 *
 * Exam readiness scoring
 */

import { ExamReadiness, TopicReadiness, StudentProgress, CurriculumTopic } from "./types";
import { getZIMSECCurriculum } from "./zimsec";
import { getCambridgeCurriculum } from "./cambridge";
import { analyzeCurriculumCoverage } from "./coverage";
import { recommendationEngine, RecommendationEngineInput, GoalInput, CareerInterestInput } from "@/lib/recommendation-engine";
import { getCareerMapping, getSubjectPriority, getCareerSubjects } from "@/lib/careers/mapping";

export function calculateExamReadiness(
  studentProgress: StudentProgress,
  timeToExam: number = 30 // days
): ExamReadiness {
  const { subject, board, level, topicProgress } = studentProgress;
  const careerIds = (studentProgress as any).careerIds;
  
  // Get curriculum
  const curriculum = board === "ZIMSEC" 
    ? getZIMSECCurriculum(subject, level)
    : getCambridgeCurriculum(subject, level);
  
  const topics = curriculum.topics;
  
  // Calculate coverage
  const coverage = analyzeCurriculumCoverage(studentProgress);
  
  // Calculate topic readiness for each topic
  const topicReadiness: Record<string, TopicReadiness> = {};
  
  topics.forEach(topic => {
    const progress = topicProgress[topic.id];
    const readiness = calculateTopicReadiness(topic, progress, careerIds);
    topicReadiness[topic.id] = readiness;
  });
  
  // Calculate overall score (weighted by exam weight)
  let totalWeight = 0;
  let weightedScore = 0;
  
  topics.forEach(topic => {
    const readiness = topicReadiness[topic.id];
    totalWeight += topic.examWeight;
    weightedScore += readiness.score * (topic.examWeight / 100);
  });
  
  const overallScore = totalWeight > 0 ? weightedScore : 0;
  
  // Determine readiness level
  const readinessLevel = getReadinessLevel(overallScore, coverage.coveragePercentage, timeToExam);
  
  // Predict grade
  const predictedGrade = predictGrade(overallScore, board, level);
  
  // Calculate confidence
  const confidence = calculateConfidence(topicReadiness, coverage.coveragePercentage);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    coverage,
    topicReadiness,
    timeToExam,
    overallScore,
    careerIds
  );
  
  return {
    subject,
    board,
    level,
    overallScore,
    readinessLevel,
    topicReadiness,
    predictedGrade,
    confidence,
    recommendations,
    timeToExam,
  };
}

function calculateTopicReadiness(topic: CurriculumTopic, progress?: any, careerIds?: string[]): TopicReadiness {
  const score = progress ? progress.score : 0;
  const attempts = progress ? progress.attempts : 0;
  const timeSpent = progress ? progress.timeSpent : 0;
  
  // Adjust score based on attempts and time spent
  let adjustedScore = score;
  
  // Bonus for consistent practice
  if (attempts >= 3) {
    adjustedScore = Math.min(100, adjustedScore + 5);
  }
  
  // Bonus for adequate time spent (estimate: 30 minutes per difficulty point)
  const expectedTime = topic.difficulty * 30;
  if (timeSpent >= expectedTime) {
    adjustedScore = Math.min(100, adjustedScore + 5);
  }
  
  // Determine readiness level
  const readiness = getTopicReadinessLevel(adjustedScore);
  
  // Calculate confidence based on attempts and consistency
  const confidence = calculateTopicConfidence(adjustedScore, attempts);
  
  // Generate recommended actions (with career context if available)
  const recommendedActions = generateTopicRecommendedActions(
    topic,
    adjustedScore,
    readiness,
    confidence,
    careerIds
  );
  
  return {
    topicId: topic.id,
    score: adjustedScore,
    readiness,
    confidence,
    recommendedActions,
  };
}

function getTopicReadinessLevel(score: number): "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Ready" {
  if (score >= 90) return "Ready";
  if (score >= 75) return "Advanced";
  if (score >= 60) return "Intermediate";
  if (score >= 40) return "Basic";
  return "Not Ready";
}

function calculateTopicConfidence(score: number, attempts: number): number {
  let confidence = score * 0.5; // Base confidence from score
  
  // Increase confidence with more attempts
  confidence += Math.min(attempts * 5, 20);
  
  // Cap at 100
  return Math.min(100, confidence);
}

function generateTopicRecommendedActions(
  topic: CurriculumTopic,
  score: number,
  readiness: string,
  confidence: number,
  careerIds?: string[]
): string[] {
  const actions: string[] = [];
  
  if (readiness === "Not Ready") {
    actions.push(`Start learning ${topic.topic}`);
    actions.push(`Complete basic exercises on ${topic.subtopics.slice(0, 2).join(", ")}`);
    actions.push(`Watch video tutorials on ${topic.topic}`);
  } else if (readiness === "Basic") {
    actions.push(`Practice more exercises on ${topic.topic}`);
    actions.push(`Focus on ${topic.subtopics.slice(0, 3).join(", ")}`);
    actions.push(`Review fundamentals of ${topic.topic}`);
  } else if (readiness === "Intermediate") {
    actions.push(`Practice advanced problems on ${topic.topic}`);
    actions.push(`Work on ${topic.subtopics.slice(2, 4).join(", ")}`);
    actions.push(`Attempt past exam questions on ${topic.topic}`);
  } else if (readiness === "Advanced") {
    actions.push(`Practice challenging problems on ${topic.topic}`);
    actions.push(`Focus on exam technique for ${topic.topic}`);
    actions.push(`Time yourself on practice questions`);
  } else if (readiness === "Ready") {
    actions.push(`Maintain practice on ${topic.topic}`);
    actions.push(`Review periodically before exam`);
    actions.push(`Focus on other weaker areas`);
  }
  
  if (confidence < 70) {
    actions.push(`Increase practice frequency to build confidence`);
  }

  // Add career-aligned actions if career interests are provided
  if (careerIds && careerIds.length > 0) {
    for (const careerId of careerIds) {
      const mapping = getCareerMapping(careerId);
      if (mapping && mapping.requiredSubjects.includes(topic.subject)) {
        actions.push(`This topic is required for ${mapping.careerName} - prioritize mastery`);
        break;
      } else if (mapping && mapping.recommendedSubjects.includes(topic.subject)) {
        actions.push(`This topic supports your ${mapping.careerName} career goals`);
        break;
      }
    }
  }
  
  return actions;
}

function getReadinessLevel(
  overallScore: number,
  coveragePercentage: number,
  timeToExam: number
): "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Exam Ready" {
  // Adjust score based on coverage
  const adjustedScore = overallScore * (coveragePercentage / 100);
  
  // Adjust based on time to exam
  const timeAdjustment = timeToExam < 7 ? -10 : timeToExam < 14 ? -5 : 0;
  const finalScore = adjustedScore + timeAdjustment;
  
  if (finalScore >= 85) return "Exam Ready";
  if (finalScore >= 70) return "Advanced";
  if (finalScore >= 55) return "Intermediate";
  if (finalScore >= 40) return "Basic";
  return "Not Ready";
}

function predictGrade(score: number, board: string, level: string): string {
  // Grade prediction based on score
  if (board === "ZIMSEC") {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    if (score >= 50) return "E";
    return "F";
  } else if (board === "Cambridge") {
    if (score >= 90) return "A*";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    if (score >= 40) return "E";
    return "F";
  }
  
  return "N/A";
}

function calculateConfidence(
  topicReadiness: Record<string, TopicReadiness>,
  coveragePercentage: number
): number {
  const readinessValues = Object.values(topicReadiness);
  
  if (readinessValues.length === 0) return 0;
  
  // Average confidence across all topics
  const avgConfidence = readinessValues.reduce((sum, r) => sum + r.confidence, 0) / readinessValues.length;
  
  // Adjust by coverage
  const adjustedConfidence = avgConfidence * (coveragePercentage / 100);
  
  return Math.min(100, adjustedConfidence);
}

function generateRecommendations(
  coverage: any,
  topicReadiness: Record<string, TopicReadiness>,
  timeToExam: number,
  overallScore: number,
  careerIds?: string[]
): string[] {
  const recommendations: string[] = [];
  
  // Coverage-based recommendations
  if (coverage.coveragePercentage < 50) {
    recommendations.push("Focus on completing missing topics first");
    recommendations.push("Prioritize high-frequency exam topics");
  } else if (coverage.coveragePercentage < 75) {
    recommendations.push("Continue working on remaining topics");
    recommendations.push("Balance between new topics and revision");
  } else {
    recommendations.push("Focus on revision and practice");
    recommendations.push("Work on weak areas");
  }
  
  // Weak topic recommendations
  const weakTopics = Object.entries(topicReadiness)
    .filter(([_, r]) => r.readiness === "Not Ready" || r.readiness === "Basic")
    .map(([_, r]) => r);
  
  if (weakTopics.length > 0) {
    recommendations.push(`Address ${weakTopics.length} weak topic${weakTopics.length > 1 ? 's' : ''} urgently`);
  }
  
  // Career-aligned recommendations
  if (careerIds && careerIds.length > 0) {
    for (const careerId of careerIds) {
      const mapping = getCareerMapping(careerId);
      if (mapping) {
        recommendations.push(`Prioritize ${mapping.requiredSubjects.join(" and ")} for ${mapping.careerName} career`);
        break;
      }
    }
  }
  
  // Time-based recommendations
  if (timeToExam < 7) {
    recommendations.push("Intensive revision mode - focus on high-yield topics");
    recommendations.push("Practice past papers under timed conditions");
  } else if (timeToExam < 14) {
    recommendations.push("Increase study frequency");
    recommendations.push("Focus on exam technique");
  } else if (timeToExam < 30) {
    recommendations.push("Maintain consistent study schedule");
    recommendations.push("Start practicing past papers");
  } else {
    recommendations.push("Follow recommended study order");
    recommendations.push("Build strong foundation in all topics");
  }
  
  // Score-based recommendations
  if (overallScore < 50) {
    recommendations.push("Focus on understanding fundamentals");
    recommendations.push("Seek help on difficult topics");
  } else if (overallScore < 70) {
    recommendations.push("Practice more problems");
    recommendations.push("Review weak areas regularly");
  } else if (overallScore < 85) {
    recommendations.push("Focus on advanced problems");
    recommendations.push("Work on exam technique");
  } else {
    recommendations.push("Maintain current level");
    recommendations.push("Focus on exam practice");
  }
  
  return recommendations;
}

/**
 * Generate curriculum recommendations using the Recommendation Engine
 * This provides more sophisticated recommendations based on multiple factors
 */
export async function generateCurriculumRecommendations(
  studentProgress: StudentProgress,
  timeToExam: number = 30,
  userId?: string
): Promise<string[]> {
  // If userId is provided, try to use the Recommendation Engine
  if (userId) {
    try {
      // Build Recommendation Engine input from curriculum progress
      const weakAreas = Object.entries(studentProgress.topicProgress)
        .filter(([_, progress]) => progress.score < 60)
        .map(([topicId, progress], index) => ({
          topicId,
          topic: topicId, // TODO: Get actual topic name
          subject: studentProgress.subject,
          severity: (progress.score < 40 ? "critical" : progress.score < 50 ? "high" : "medium") as "critical" | "high" | "medium" | "low",
          score: progress.score,
          lastAssessed: new Date().toISOString(),
          recommendedActions: [
            "Review fundamentals",
            "Practice exercises",
            "Take quiz",
          ],
          estimatedTimeToImprove: Math.ceil((60 - progress.score) / 10),
        }));

      const curriculumProgress = {
        overallCompletion: 0, // TODO: Calculate from topicProgress
        curriculum: {
          totalLessons: 0,
          completedLessons: 0,
          inProgressLessons: 0,
          lockedLessons: 0,
          completionPercentage: 0,
          weightedCompletion: 0,
          currentLesson: null,
          recommendedNextLesson: null,
        },
        lessons: [],
        subjects: [],
      };

      const examReadiness = {
        subject: studentProgress.subject,
        board: studentProgress.board,
        level: studentProgress.level,
        overallScore: 0, // TODO: Calculate from topicProgress
        readinessLevel: "Intermediate" as const,
        predictedGrade: "B",
        confidence: 50,
        timeToExam,
        topicReadiness: {},
      };

      const studyActivity = {
        sessions: [],
        timeSpent: {},
        patterns: {
          mostActiveTime: "10:00",
          mostActiveDay: "Monday",
          averageDailyStudyTime: 0,
          studyFrequency: 0,
          consistencyScore: 50,
        },
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: new Date().toISOString(),
        },
      };

      const goals: GoalInput[] = [];
      
      // Build career interests from studentProgress if available
      const careerInterests: CareerInterestInput[] = [];
      const careerIds = (studentProgress as any).careerIds;
      if (careerIds && careerIds.length > 0) {
        for (const careerId of careerIds) {
          const mapping = getCareerMapping(careerId);
          if (mapping) {
            careerInterests.push({
              careerId: mapping.careerId,
              careerName: mapping.careerName,
              recommendedSubjects: getCareerSubjects(mapping.careerId),
              recommendedCourses: [],
            });
          }
        }
      }

      const input: RecommendationEngineInput = {
        userId,
        curriculumProgress,
        weakAreas,
        examReadiness,
        studyActivity,
        goals,
        careerInterests,
      };

      const output = await recommendationEngine.generateRecommendations(input);
      
      // Convert engine output to string recommendations
      const recommendations: string[] = [];
      
      if (output.recommendedLesson.lessonId !== "unknown") {
        recommendations.push(`Focus on lesson: ${output.recommendedLesson.lessonTitle}`);
      }
      
      if (output.recommendedRevisionTopic.topicId !== "none") {
        recommendations.push(`Revise topic: ${output.recommendedRevisionTopic.topic}`);
        output.recommendedRevisionTopic.recommendedActions.forEach(action => {
          recommendations.push(action);
        });
      }
      
      if (output.recommendedExamPractice.practiceType !== "mixed") {
        recommendations.push(`Practice: ${output.recommendedExamPractice.topic} (${output.recommendedExamPractice.practiceType})`);
      }
      
      recommendations.push(output.recommendedStudyAction.action);
      
      return recommendations;
    } catch (error) {
      console.error("[generateCurriculumRecommendations] Error using recommendation engine:", error);
      // Fall back to old logic
    }
  }

  // Fallback to old logic
  const coverage = analyzeCurriculumCoverage(studentProgress);
  const curriculum = studentProgress.board === "ZIMSEC" 
    ? getZIMSECCurriculum(studentProgress.subject, studentProgress.level)
    : getCambridgeCurriculum(studentProgress.subject, studentProgress.level);
  
  const topicReadiness: Record<string, TopicReadiness> = {};
  curriculum.topics.forEach(topic => {
    const progress = studentProgress.topicProgress[topic.id];
    topicReadiness[topic.id] = calculateTopicReadiness(topic, progress);
  });
  
  const overallScore = 0; // TODO: Calculate from topicReadiness
  return generateRecommendations(coverage, topicReadiness, timeToExam, overallScore);
}
