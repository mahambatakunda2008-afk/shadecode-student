/**
 * /lib/curriculum/types.ts
 *
 * Curriculum intelligence types
 */

export type CurriculumBoard = "ZIMSEC" | "Cambridge" | "IB" | "Edexcel";
export type CurriculumLevel = "O-Level" | "A-Level" | "IGCSE" | "AS-Level" | "Form 1-2" | "Form 3-4";
export type Subject = "Mathematics" | "English" | "Science" | "Physics" | "Chemistry" | "Biology" | "Shona" | "Ndebele" | "History" | "Geography" | "Commerce" | "Economics";

export interface CurriculumTopic {
  id: string;
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  topic: string;
  subtopics: string[];
  weight: number; // Importance weight (1-10)
  examFrequency: number; // How often it appears in exams (1-10)
  difficulty: number; // Difficulty level (1-10)
  prerequisites: string[]; // Topic IDs that must be learned first
  learningObjectives: string[];
  examWeight: number; // Percentage of exam marks
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
  duration: number; // in minutes
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
  completedTopics: string[]; // Topic IDs
  topicProgress: Record<string, TopicProgress>; // Topic ID -> progress
  lastUpdated: string;
}

export interface TopicProgress {
  topicId: string;
  completed: boolean;
  score: number; // 0-100
  timeSpent: number; // in minutes
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
  weightedCoverage: number; // Weighted by topic importance
  missingTopics: string[];
  weakTopics: string[];
  strongTopics: string[];
}

export interface ExamReadiness {
  subject: Subject;
  board: CurriculumBoard;
  level: CurriculumLevel;
  overallScore: number; // 0-100
  readinessLevel: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Exam Ready";
  topicReadiness: Record<string, TopicReadiness>;
  predictedGrade: string;
  confidence: number; // 0-100
  recommendations: string[];
  timeToExam: number; // in days
}

export interface TopicReadiness {
  topicId: string;
  score: number; // 0-100
  readiness: "Not Ready" | "Basic" | "Intermediate" | "Advanced" | "Ready";
  confidence: number; // 0-100
  recommendedActions: string[];
}

export interface CurriculumGap {
  topicId: string;
  topic: string;
  gapType: "missing" | "weak" | "outdated";
  severity: "low" | "medium" | "high" | "critical";
  impact: number; // Impact on exam performance (1-10)
  recommendedActions: string[];
  estimatedTimeToComplete: number; // in hours
}
