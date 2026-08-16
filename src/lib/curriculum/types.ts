/**
 * Curriculum and academic-context intelligence types.
 *
 * Exam-board curricula remain supported for secondary learners. University
 * and polytechnic/TVET learners use the more flexible academic-context model.
 */

export type CurriculumBoard = "ZIMSEC" | "Cambridge" | "IB" | "Edexcel";
export type CurriculumLevel = "O-Level" | "A-Level" | "IGCSE" | "AS-Level" | "Form 1-2" | "Form 3-4";
export type Subject = "Mathematics" | "English" | "Science" | "Physics" | "Chemistry" | "Biology" | "Shona" | "Ndebele" | "History" | "Geography" | "Commerce" | "Economics";

export type AcademicPathway = "secondary" | "university" | "tvet";
export type AssessmentType =
  | "assignment"
  | "project"
  | "quiz"
  | "test"
  | "midterm"
  | "exam"
  | "practical"
  | "lab"
  | "workshop"
  | "presentation"
  | "report";

/** Flexible academic identity for post-secondary learners. */
export interface AcademicContext {
  pathway: AcademicPathway;
  institution?: string;
  programme?: string;
  yearLevel?: string;
  semester?: string;
  term?: string;
  courses: AcademicCourse[];
}

export interface AcademicCourse {
  id: string;
  code?: string;
  name: string;
  description?: string;
  credits?: number;
  topics: string[];
  assessmentTypes: AssessmentType[];
}

export interface AcademicAssessment {
  id: string;
  courseId: string;
  title: string;
  type: AssessmentType;
  dueAt?: string;
  weight?: number;
  completed: boolean;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  kind: "notes" | "slides" | "pdf" | "assignment" | "past_paper" | "reading" | "other";
  sourceUrl?: string;
}

export interface CurriculumTopic {
  id: string;
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  topic: string;
  subtopics: string[];
  weight: number;
  examFrequency: number;
  difficulty: number;
  prerequisites: string[];
  learningObjectives: string[];
  examWeight: number;
}

export interface CurriculumStandard {
  board: CurriculumBoard;
  level: CurriculumLevel;
  subject: Subject;
  topics: CurriculumTopic[];
  totalTopics: number;
  examStructure: ExamStructure;
}

export interface ExamStructure {
  paper1: PaperStructure;
  paper2?: PaperStructure;
  paper3?: PaperStructure;
}

export interface PaperStructure {
  duration: number;
  totalMarks: number;
  sections: ExamSection[];
}

export interface ExamSection {
  name: string;
  marks: number;
  questionTypes: string[];
  topics: string[];
}

export interface StudentProgress {
  userId: string;
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  completedTopics: string[];
  topicProgress: Record<string, TopicProgress>;
  lastUpdated: string;
}

export interface TopicProgress {
  topicId: string;
  completed: boolean;
  score: number;
  timeSpent: number;
  lastAttempted: string;
  attempts: number;
}

export interface CurriculumCoverage {
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  totalTopics: number;
  completedTopics: number;
  coveragePercentage: number;
  weightedCoverage: number;
  missingTopics: string[];
  weakTopics: string[];
  strongTopics: string[];
}

export interface ExamReadiness {
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  overallScore: number;
  readinessLevel: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Exam Ready";
  topicReadiness: Record<string, TopicReadiness>;
  predictedGrade: string;
  confidence: number;
  recommendations: string[];
  timeToExam: number;
}

export interface TopicReadiness {
  topicId: string;
  score: number;
  readiness: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Ready";
  confidence: number;
  recommendedActions: string[];
}

export interface CurriculumGap {
  topicId: string;
  topic: string;
  gapType: "missing" | "weak" | "outdated";
  severity: "low" | "medium" | "high" | "critical";
  impact: number;
  recommendedActions: string[];
  estimatedTimeToComplete: number;
}
