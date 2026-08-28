import type { StudyLevel } from "@/types";

export interface AcademicExperience {
  stage: StudyLevel;
  label: string;
  shortLabel: string;
  homeTitle: string;
  homeSubtitle: string;
  primaryAction: string;
  secondaryAction: string;
  navMode: "foundation" | "school" | "advanced-school" | "tertiary" | "professional";
  showExamHub: boolean;
  showExamSim: boolean;
  showLeaderboard: boolean;
  showCareer: boolean;
}

const EXPERIENCES: Record<StudyLevel, AcademicExperience> = {
  primary: {
    stage: "primary", label: "Primary", shortLabel: "Primary", homeTitle: "Let's learn something new", homeSubtitle: "Short lessons, practice games and simple challenges built for your stage.", primaryAction: "Start learning", secondaryAction: "Try a challenge", navMode: "foundation", showExamHub: false, showExamSim: false, showLeaderboard: true, showCareer: false,
  },
  "lower-secondary": {
    stage: "lower-secondary", label: "Lower Secondary", shortLabel: "Lower Secondary", homeTitle: "Build your foundations", homeSubtitle: "Learn concepts, practise step by step and build confidence across your subjects.", primaryAction: "Continue learning", secondaryAction: "Practice now", navMode: "school", showExamHub: false, showExamSim: true, showLeaderboard: true, showCareer: false,
  },
  "upper-secondary": {
    stage: "upper-secondary", label: "Upper Secondary", shortLabel: "Upper Secondary", homeTitle: "Turn practice into progress", homeSubtitle: "Focused lessons, exam practice and targeted revision for senior secondary study.", primaryAction: "Continue studying", secondaryAction: "Practice questions", navMode: "school", showExamHub: true, showExamSim: true, showLeaderboard: true, showCareer: false,
  },
  "a-level": {
    stage: "a-level", label: "A-Level / Sixth Form", shortLabel: "A-Level", homeTitle: "Study at A-Level depth", homeSubtitle: "Master your syllabus, attack weak topics and prepare with serious exam practice.", primaryAction: "Continue revision", secondaryAction: "Start an exam", navMode: "advanced-school", showExamHub: true, showExamSim: true, showLeaderboard: true, showCareer: true,
  },
  university: {
    stage: "university", label: "University", shortLabel: "University", homeTitle: "Own your programme", homeSubtitle: "Organise courses, assignments and deep study around your degree.", primaryAction: "Open my courses", secondaryAction: "Study a module", navMode: "tertiary", showExamHub: false, showExamSim: false, showLeaderboard: false, showCareer: true,
  },
  tvet: {
    stage: "tvet", label: "Polytechnic / TVET", shortLabel: "TVET", homeTitle: "Build practical mastery", homeSubtitle: "Learn the theory, practise the skill and keep your practical work organised.", primaryAction: "Continue training", secondaryAction: "Open practical work", navMode: "tertiary", showExamHub: false, showExamSim: true, showLeaderboard: false, showCareer: true,
  },
  professional: {
    stage: "professional", label: "Professional", shortLabel: "Professional", homeTitle: "Keep growing", homeSubtitle: "Build job-ready knowledge, practise skills and stay on track with your qualification.", primaryAction: "Continue development", secondaryAction: "Work on a skill", navMode: "professional", showExamHub: false, showExamSim: false, showLeaderboard: false, showCareer: true,
  },
};

export function getAcademicExperience(stage?: string | null): AcademicExperience {
  return EXPERIENCES[(stage as StudyLevel) ?? "upper-secondary"] ?? EXPERIENCES["upper-secondary"];
}

export function normalizeStudyLevel(value?: string | null): StudyLevel {
  if (value && value in EXPERIENCES) return value as StudyLevel;
  return "upper-secondary";
}
