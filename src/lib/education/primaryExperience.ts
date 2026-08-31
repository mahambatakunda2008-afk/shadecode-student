import { getExperienceProfile, primaryGradeStage, type ExperienceProfile } from "./experience";

export type PrimaryGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PrimaryExperience = ExperienceProfile & {
  grade: PrimaryGrade;
  subjectPromptStyle: "story_and_objects" | "guided_discovery";
  assessmentStyle: "playful_check" | "short_practice";
  maxConceptsPerLesson: 1 | 2;
};

export function getPrimaryExperience(grade: PrimaryGrade): PrimaryExperience {
  const profile = getExperienceProfile(primaryGradeStage(grade));
  return {
    ...profile,
    grade,
    subjectPromptStyle: grade <= 3 ? "story_and_objects" : "guided_discovery",
    assessmentStyle: grade <= 3 ? "playful_check" : "short_practice",
    maxConceptsPerLesson: grade <= 3 ? 1 : 2,
  };
}

export const PRIMARY_SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Heritage Studies",
  "Shona",
  "Ndebele",
] as const;
