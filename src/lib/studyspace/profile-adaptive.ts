import type { LearnerProfile, TopicMastery } from "./profile";
import type { StudySpaceMode } from "./types";

export type AdaptiveAction = "lesson" | "practice" | "workmate" | "challenge";

export type ProfileRecommendation = {
  action: AdaptiveAction;
  subject?: string;
  topic?: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

function weakest(profile: LearnerProfile): TopicMastery | undefined {
  return profile.topicMastery.find((topic) => topic.weak || topic.trend === "declining");
}

function strongest(profile: LearnerProfile): TopicMastery | undefined {
  return [...profile.topicMastery].reverse().find((topic) => topic.strong && topic.trend !== "declining");
}

export function recommendFromProfile(
  profile: LearnerProfile,
  currentSubject?: string,
  currentMode?: StudySpaceMode,
): ProfileRecommendation {
  const subject = currentSubject?.trim() || undefined;
  const weak = profile.topicMastery.find((item) => item.subject === subject && (item.weak || item.trend === "declining"))
    ?? (!subject ? weakest(profile) : undefined);

  if (weak) {
    return {
      action: "lesson",
      subject: weak.subject,
      topic: weak.topic,
      reason: weak.trend === "declining" ? `Your recent performance in ${weak.topic} is declining.` : `You are still developing ${weak.topic}.`,
      priority: "high",
    };
  }

  const strong = profile.topicMastery.find((item) => item.subject === subject && item.strong)
    ?? (!subject ? strongest(profile) : undefined);

  if (strong) {
    return {
      action: currentMode === "exam" ? "challenge" : "practice",
      subject: strong.subject,
      topic: strong.topic,
      reason: `You are performing strongly in ${strong.topic}. Increase the difficulty and test transfer.` ,
      priority: "medium",
    };
  }

  return {
    action: "practice",
    subject,
    reason: "Build more evidence before changing your learning path.",
    priority: "low",
  };
}
