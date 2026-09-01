export type EducationStage =
  | "primary_1"
  | "primary_2"
  | "primary_3"
  | "primary_4"
  | "primary_5"
  | "primary_6"
  | "primary_7"
  | "junior_secondary"
  | "senior_secondary"
  | "university"
  | "polytechnic";

export type ExperienceProfile = {
  stage: EducationStage;
  label: string;
  learnerLabel: string;
  description: string;
  uiTone: "playful" | "focused" | "advanced" | "professional";
  recommendedModes: string[];
};

const profiles: Record<EducationStage, ExperienceProfile> = {
  primary_1: { stage: "primary_1", label: "Primary 1", learnerLabel: "Young Learner", description: "Short, visual, confidence-building activities.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_2: { stage: "primary_2", label: "Primary 2", learnerLabel: "Young Learner", description: "Short, visual, confidence-building activities.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_3: { stage: "primary_3", label: "Primary 3", learnerLabel: "Young Learner", description: "Short, visual, confidence-building activities.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_4: { stage: "primary_4", label: "Primary 4", learnerLabel: "Learner", description: "Interactive practice with growing independence.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_5: { stage: "primary_5", label: "Primary 5", learnerLabel: "Learner", description: "Interactive practice with growing independence.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_6: { stage: "primary_6", label: "Primary 6", learnerLabel: "Learner", description: "Interactive practice with growing independence.", uiTone: "playful", recommendedModes: ["learn", "practice", "challenge"] },
  primary_7: { stage: "primary_7", label: "Primary 7", learnerLabel: "Primary Final-Year Learner", description: "Focused preparation with strong practice loops.", uiTone: "focused", recommendedModes: ["learn", "practice", "exam"] },
  junior_secondary: { stage: "junior_secondary", label: "Junior Secondary", learnerLabel: "Student", description: "Structured learning, practice and assessment.", uiTone: "focused", recommendedModes: ["learn", "practice", "exam", "review"] },
  senior_secondary: { stage: "senior_secondary", label: "Senior Secondary", learnerLabel: "Student", description: "Exam-focused study with deeper reasoning and mastery tracking.", uiTone: "advanced", recommendedModes: ["learn", "practice", "exam", "review", "mastery"] },
  university: { stage: "university", label: "University", learnerLabel: "University Student", description: "Flexible, independent study for advanced subjects and projects.", uiTone: "professional", recommendedModes: ["learn", "practice", "research", "review", "mastery"] },
  polytechnic: { stage: "polytechnic", label: "Polytechnic", learnerLabel: "Polytechnic Student", description: "Applied learning, technical practice and assessment.", uiTone: "professional", recommendedModes: ["learn", "practice", "projects", "exam", "mastery"] },
};

export function getExperienceProfile(stage: EducationStage): ExperienceProfile {
  return profiles[stage];
}

export function primaryGradeStage(grade: number): EducationStage {
  const normalized = Math.max(1, Math.min(7, Math.round(grade)));
  return `primary_${normalized}` as EducationStage;
}
