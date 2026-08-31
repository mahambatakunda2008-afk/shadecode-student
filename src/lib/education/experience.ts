export type EducationStage = "early_primary" | "upper_primary" | "junior_secondary" | "senior_secondary" | "a_level" | "tertiary" | "adult";

export type ExperienceProfile = {
  stage: EducationStage;
  label: string;
  ui: { density: "airy" | "balanced" | "dense"; motion: "gentle" | "energetic" | "minimal"; interaction: "touch" | "mixed" | "precision" };
  copy: { greeting: string; correct: string; incorrect: string; retry: string; empty: string };
  learning: { explanation: "concrete" | "guided" | "analytical" | "technical"; defaultQuestionCount: number };
  rewards: "adventure" | "collection" | "challenge" | "mastery" | "professional";
};

export const EXPERIENCE_PROFILES: Record<EducationStage, ExperienceProfile> = {
  early_primary: { stage: "early_primary", label: "Early Primary", ui: { density: "airy", motion: "gentle", interaction: "touch" }, copy: { greeting: "Ready for today's little discovery?", correct: "You got it! 🌟", incorrect: "Not yet. Let's try it together.", retry: "Have another go!", empty: "Your next learning adventure is waiting." }, learning: { explanation: "concrete", defaultQuestionCount: 4 }, rewards: "adventure" },
  upper_primary: { stage: "upper_primary", label: "Upper Primary", ui: { density: "airy", motion: "energetic", interaction: "touch" }, copy: { greeting: "What's your next challenge?", correct: "Nice work! Keep going.", incorrect: "Close! Check that step and try again.", retry: "One more attempt.", empty: "Pick a challenge and start building your streak." }, learning: { explanation: "concrete", defaultQuestionCount: 6 }, rewards: "collection" },
  junior_secondary: { stage: "junior_secondary", label: "Junior Secondary", ui: { density: "balanced", motion: "energetic", interaction: "mixed" }, copy: { greeting: "Let's find something worth mastering.", correct: "Correct. That's solid.", incorrect: "There's a gap in that step. Find it and try again.", retry: "Run it back.", empty: "Your next challenge is ready." }, learning: { explanation: "guided", defaultQuestionCount: 8 }, rewards: "challenge" },
  senior_secondary: { stage: "senior_secondary", label: "Senior Secondary", ui: { density: "balanced", motion: "minimal", interaction: "mixed" }, copy: { greeting: "Focus on the marks that matter.", correct: "Correct.", incorrect: "Incorrect. Identify the exact step where the method breaks.", retry: "Try the problem again.", empty: "No active target yet. Choose a topic to train." }, learning: { explanation: "analytical", defaultQuestionCount: 10 }, rewards: "mastery" },
  a_level: { stage: "a_level", label: "AS / A Level", ui: { density: "dense", motion: "minimal", interaction: "precision" }, copy: { greeting: "Choose the gap. Close the gap.", correct: "Correct. Method and result are sound.", incorrect: "Incorrect. Recheck the reasoning, not just the final answer.", retry: "Attempt again with a cleaner method.", empty: "Select a syllabus objective to work on." }, learning: { explanation: "technical", defaultQuestionCount: 12 }, rewards: "mastery" },
  tertiary: { stage: "tertiary", label: "University / Polytechnic", ui: { density: "dense", motion: "minimal", interaction: "precision" }, copy: { greeting: "What are you building or mastering today?", correct: "Correct. The reasoning holds.", incorrect: "The conclusion is not supported by the current reasoning.", retry: "Rework the weak step.", empty: "Your workspace is ready for the next module or project." }, learning: { explanation: "technical", defaultQuestionCount: 12 }, rewards: "professional" },
  adult: { stage: "adult", label: "Adult / Professional", ui: { density: "dense", motion: "minimal", interaction: "precision" }, copy: { greeting: "What outcome are you working toward?", correct: "Done. Keep the momentum.", incorrect: "That result needs another pass.", retry: "Try a different approach.", empty: "Set an outcome and start the next step." }, learning: { explanation: "technical", defaultQuestionCount: 8 }, rewards: "professional" },
};

export function getExperienceProfile(stage?: string | null): ExperienceProfile {
  if (stage && stage in EXPERIENCE_PROFILES) return EXPERIENCE_PROFILES[stage as EducationStage];
  return EXPERIENCE_PROFILES.senior_secondary;
}

export function primaryGradeStage(grade: number): EducationStage {
  return grade <= 3 ? "early_primary" : "upper_primary";
}
