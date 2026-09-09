import type { StudyLevel } from "@/types";

export type ExperienceFamily = "foundation" | "school" | "beyond-school";

export type AcademicModule = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export interface AcademicExperience {
  stage: StudyLevel;
  family: ExperienceFamily;
  label: string;
  shortLabel: string;
  homeTitle: string;
  homeSubtitle: string;
  primaryAction: string;
  primaryHref: string;
  secondaryAction: string;
  secondaryHref: string;
  navMode: "foundation" | "school" | "advanced-school" | "tertiary" | "professional";
  showExamHub: boolean;
  showExamSim: boolean;
  showLeaderboard: boolean;
  showCareer: boolean;
  modules: AcademicModule[];
  allowedRoutes: string[];
  terminology: {
    progress: string;
    primaryNav: string;
    secondaryNav: string;
    profileStat: string;
    streakLabel: string;
  };
}

const FOUNDATION_ROUTES = ["/dashboard", "/discovery", "/learn", "/daily-challenge", "/achievements", "/settings"];
const PRIMARY_ROUTES = ["/dashboard", "/discovery", "/learn", "/daily-challenge", "/tasks", "/focus", "/timetable", "/study-plan", "/achievements", "/settings"];
const SCHOOL_ROUTES = ["/dashboard", "/discovery", "/learn", "/focus", "/tasks", "/timetable", "/study-plan", "/exams", "/exam-sim", "/analytics", "/leaderboard", "/achievements", "/settings"];
const SENIOR_ROUTES = [...SCHOOL_ROUTES, "/exam-hub", "/curriculum"];
const TERTIARY_ROUTES = ["/dashboard", "/learn", "/focus", "/tasks", "/timetable", "/study-plan", "/curriculum", "/studyspace", "/projects", "/workmate", "/analytics", "/careers", "/achievements", "/settings"];
const TVET_ROUTES = ["/dashboard", "/learn", "/focus", "/tasks", "/timetable", "/study-plan", "/curriculum", "/studyspace", "/projects", "/workmate", "/exams", "/exam-sim", "/analytics", "/careers", "/achievements", "/settings"];
const PROFESSIONAL_ROUTES = ["/dashboard", "/learn", "/focus", "/tasks", "/study-plan", "/studyspace", "/projects", "/workmate", "/analytics", "/careers", "/settings"];

const foundationTerms = { progress: "Growth", primaryNav: "Discover", secondaryNav: "Keep exploring", profileStat: "Points", streakLabel: "days exploring" };
const schoolTerms = { progress: "Progress", primaryNav: "Study", secondaryNav: "Practice", profileStat: "XP", streakLabel: "day study streak" };
const beyondTerms = { progress: "Progress", primaryNav: "Workspace", secondaryNav: "Work", profileStat: "XP", streakLabel: "day learning streak" };

const EXPERIENCES: Record<StudyLevel, AcademicExperience> = {
  "early-childhood": {
    stage: "early-childhood", family: "foundation", label: "Early Childhood", shortLabel: "ECD", homeTitle: "Let's discover", homeSubtitle: "Play, listen, notice and build strong early foundations through short activities.", primaryAction: "Start discovering", primaryHref: "/discovery", secondaryAction: "Hear a story", secondaryHref: "/learn", navMode: "foundation", showExamHub: false, showExamSim: false, showLeaderboard: false, showCareer: false, terminology: foundationTerms,
    modules: [
      { id: "discovery", label: "Discovery", href: "/discovery", description: "Play, explore and notice." },
      { id: "stories", label: "Stories & Language", href: "/learn", description: "Listen, speak, recognise and tell." },
      { id: "numbers", label: "Numbers & Shapes", href: "/discovery", description: "Count, compare, sort and build." },
      { id: "world", label: "My World", href: "/discovery", description: "Explore people, nature and everyday life." },
    ],
    allowedRoutes: FOUNDATION_ROUTES,
  },
  primary: {
    stage: "primary", family: "foundation", label: "Primary", shortLabel: "Primary", homeTitle: "Let's learn something new", homeSubtitle: "Discover ideas, practise skills and build confidence one step at a time.", primaryAction: "Start learning", primaryHref: "/discovery", secondaryAction: "Try a challenge", secondaryHref: "/daily-challenge", navMode: "foundation", showExamHub: false, showExamSim: false, showLeaderboard: true, showCareer: false, terminology: foundationTerms,
    modules: [
      { id: "discovery", label: "Discovery", href: "/discovery", description: "Learn by doing, trying and correcting." },
      { id: "learn", label: "Learn", href: "/learn", description: "Build understanding in short lessons." },
      { id: "practice", label: "Practice", href: "/tasks", description: "Keep schoolwork moving." },
      { id: "challenge", label: "Daily Challenge", href: "/daily-challenge", description: "A quick skill-building activity." },
    ],
    allowedRoutes: PRIMARY_ROUTES,
  },
  "lower-secondary": {
    stage: "lower-secondary", family: "school", label: "Lower Secondary", shortLabel: "Lower Secondary", homeTitle: "Build your foundations", homeSubtitle: "Understand the ideas, practise deliberately and build confidence across your subjects.", primaryAction: "Continue learning", primaryHref: "/learn", secondaryAction: "Practice now", secondaryHref: "/exam-sim", navMode: "school", showExamHub: false, showExamSim: true, showLeaderboard: true, showCareer: false, terminology: schoolTerms,
    modules: [
      { id: "learn", label: "Learn", href: "/learn", description: "Build concepts step by step." },
      { id: "practice", label: "Practice", href: "/exam-sim", description: "Apply what you know." },
      { id: "plan", label: "Study Plan", href: "/study-plan", description: "Turn goals into a routine." },
      { id: "progress", label: "Progress", href: "/analytics", description: "See where you are improving." },
    ],
    allowedRoutes: SCHOOL_ROUTES,
  },
  "upper-secondary": {
    stage: "upper-secondary", family: "school", label: "Upper Secondary", shortLabel: "Upper Secondary", homeTitle: "Turn practice into progress", homeSubtitle: "Focused learning, exam practice and targeted revision for senior secondary study.", primaryAction: "Continue studying", primaryHref: "/learn", secondaryAction: "Practice questions", secondaryHref: "/exam-sim", navMode: "school", showExamHub: true, showExamSim: true, showLeaderboard: true, showCareer: false, terminology: schoolTerms,
    modules: [
      { id: "learn", label: "Learn", href: "/learn", description: "Master difficult topics." },
      { id: "papers", label: "Exam Hub", href: "/exam-hub", description: "Work from real exam material." },
      { id: "simulation", label: "Exam Sim", href: "/exam-sim", description: "Practise under pressure." },
      { id: "analytics", label: "Progress", href: "/analytics", description: "Target weak areas." },
    ],
    allowedRoutes: SENIOR_ROUTES,
  },
  "a-level": {
    stage: "a-level", family: "school", label: "A-Level / Sixth Form", shortLabel: "A-Level", homeTitle: "Study at A-Level depth", homeSubtitle: "Master your syllabus, attack weak topics and prepare with serious exam practice.", primaryAction: "Continue revision", primaryHref: "/learn", secondaryAction: "Start an exam", secondaryHref: "/exam-sim", navMode: "advanced-school", showExamHub: true, showExamSim: true, showLeaderboard: true, showCareer: true, terminology: schoolTerms,
    modules: [
      { id: "syllabus", label: "Syllabus", href: "/curriculum", description: "Track the exact course." },
      { id: "learn", label: "Deep Learn", href: "/learn", description: "Attack weak topics at syllabus depth." },
      { id: "papers", label: "Past Papers", href: "/exam-hub", description: "Practise from real papers." },
      { id: "simulation", label: "Exam Sim", href: "/exam-sim", description: "Test timing and technique." },
    ],
    allowedRoutes: SENIOR_ROUTES,
  },
  university: {
    stage: "university", family: "beyond-school", label: "University", shortLabel: "University", homeTitle: "Own your programme", homeSubtitle: "Organise courses, assignments and deep study around your degree.", primaryAction: "Open my courses", primaryHref: "/curriculum", secondaryAction: "Study a module", secondaryHref: "/learn", navMode: "tertiary", showExamHub: false, showExamSim: false, showLeaderboard: false, showCareer: true, terminology: beyondTerms,
    modules: [
      { id: "programme", label: "My Programme", href: "/curriculum", description: "Organise modules around your degree." },
      { id: "studyspace", label: "StudySpace", href: "/studyspace", description: "Think, write and work in one place." },
      { id: "workmate", label: "Workmate", href: "/workmate", description: "Organise assignments and projects." },
      { id: "careers", label: "Career", href: "/careers", description: "Connect study to what comes next." },
    ],
    allowedRoutes: TERTIARY_ROUTES,
  },
  tvet: {
    stage: "tvet", family: "beyond-school", label: "Polytechnic / TVET", shortLabel: "TVET", homeTitle: "Build practical mastery", homeSubtitle: "Learn the theory, practise the skill and keep your practical work organised.", primaryAction: "Continue training", primaryHref: "/learn", secondaryAction: "Open practical work", secondaryHref: "/workmate", navMode: "tertiary", showExamHub: false, showExamSim: true, showLeaderboard: false, showCareer: true, terminology: beyondTerms,
    modules: [
      { id: "training", label: "Training", href: "/learn", description: "Learn the theory behind the skill." },
      { id: "practical", label: "Practical Work", href: "/workmate", description: "Projects, evidence and tasks." },
      { id: "assessment", label: "Assessments", href: "/exams", description: "Prepare for practical and written assessment." },
      { id: "career", label: "Career", href: "/careers", description: "Build job-ready direction." },
    ],
    allowedRoutes: TVET_ROUTES,
  },
  professional: {
    stage: "professional", family: "beyond-school", label: "Professional", shortLabel: "Professional", homeTitle: "Keep growing", homeSubtitle: "Build job-ready knowledge, practise useful skills and stay on track with your qualification.", primaryAction: "Continue development", primaryHref: "/learn", secondaryAction: "Work on a skill", secondaryHref: "/workmate", navMode: "professional", showExamHub: false, showExamSim: false, showLeaderboard: false, showCareer: true, terminology: beyondTerms,
    modules: [
      { id: "develop", label: "Develop", href: "/learn", description: "Build knowledge around your goals." },
      { id: "work", label: "Workmate", href: "/workmate", description: "Turn real work into organised practice." },
      { id: "projects", label: "Projects", href: "/projects", description: "Build evidence and a portfolio." },
      { id: "career", label: "Career", href: "/careers", description: "Keep learning connected to work." },
    ],
    allowedRoutes: PROFESSIONAL_ROUTES,
  },
};

export function getAcademicExperience(stage?: string | null): AcademicExperience {
  return EXPERIENCES[(stage as StudyLevel) ?? "upper-secondary"] ?? EXPERIENCES["upper-secondary"];
}

export function normalizeStudyLevel(value?: string | null): StudyLevel {
  if (value && value in EXPERIENCES) return value as StudyLevel;
  return "upper-secondary";
}
