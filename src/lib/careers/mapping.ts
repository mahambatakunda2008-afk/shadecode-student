/**
 * /lib/careers/mapping.ts
 *
 * Career-to-Subject Mapping
 * Defines which subjects are required for each career path
 */

export interface CareerSubjectMapping {
  careerId: string;
  careerName: string;
  requiredSubjects: string[];
  recommendedSubjects: string[];
  optionalSubjects: string[];
  subjectPriorities: Record<string, number>; // subject -> priority (1-10)
  explanation: string;
}

export const CAREER_SUBJECT_MAPPINGS: CareerSubjectMapping[] = [
  {
    careerId: "software-engineering",
    careerName: "Software Engineering",
    requiredSubjects: ["Mathematics", "Computer Science"],
    recommendedSubjects: ["Physics", "English"],
    optionalSubjects: ["Chemistry", "Biology"],
    subjectPriorities: {
      "Mathematics": 10,
      "Computer Science": 10,
      "Physics": 7,
      "English": 6,
      "Chemistry": 4,
      "Biology": 3,
    },
    explanation: "Software Engineering requires strong mathematical foundations for algorithms and data structures, and Computer Science for programming concepts. Physics develops problem-solving skills, while English is essential for communication and documentation.",
  },
  {
    careerId: "medicine",
    careerName: "Medicine",
    requiredSubjects: ["Biology", "Chemistry", "Physics"],
    recommendedSubjects: ["Mathematics", "English"],
    optionalSubjects: ["Computer Science", "Geography"],
    subjectPriorities: {
      "Biology": 10,
      "Chemistry": 10,
      "Physics": 10,
      "Mathematics": 8,
      "English": 7,
      "Computer Science": 4,
      "Geography": 3,
    },
    explanation: "Medicine requires strong foundations in Biology, Chemistry, and Physics for understanding human physiology and medical treatments. Mathematics is essential for calculations, while English is crucial for patient communication.",
  },
  {
    careerId: "law",
    careerName: "Law",
    requiredSubjects: ["English", "History"],
    recommendedSubjects: ["Mathematics", "Economics"],
    optionalSubjects: ["Geography", "Politics"],
    subjectPriorities: {
      "English": 10,
      "History": 10,
      "Mathematics": 7,
      "Economics": 6,
      "Geography": 4,
      "Politics": 4,
    },
    explanation: "Law requires excellent English skills for legal writing and argumentation, and History for understanding legal precedents. Mathematics develops logical reasoning, while Economics provides context for commercial law.",
  },
  {
    careerId: "engineering",
    careerName: "Engineering",
    requiredSubjects: ["Mathematics", "Physics"],
    recommendedSubjects: ["Chemistry", "Computer Science"],
    optionalSubjects: ["English", "Economics"],
    subjectPriorities: {
      "Mathematics": 10,
      "Physics": 10,
      "Chemistry": 8,
      "Computer Science": 7,
      "English": 5,
      "Economics": 4,
    },
    explanation: "Engineering requires strong Mathematics for calculations and Physics for understanding physical principles. Chemistry is important for materials science, while Computer Science is increasingly relevant for modern engineering.",
  },
  {
    careerId: "data-science",
    careerName: "Data Science",
    requiredSubjects: ["Mathematics", "Computer Science"],
    recommendedSubjects: ["Physics", "Statistics"],
    optionalSubjects: ["Economics", "English"],
    subjectPriorities: {
      "Mathematics": 10,
      "Computer Science": 10,
      "Physics": 7,
      "Statistics": 8,
      "Economics": 5,
      "English": 4,
    },
    explanation: "Data Science requires strong Mathematics for statistical analysis and Computer Science for programming. Physics develops analytical thinking, while Statistics is directly applicable to data analysis.",
  },
  {
    careerId: "architecture",
    careerName: "Architecture",
    requiredSubjects: ["Mathematics", "Physics"],
    recommendedSubjects: ["Art", "Design"],
    optionalSubjects: ["English", "History"],
    subjectPriorities: {
      "Mathematics": 10,
      "Physics": 10,
      "Art": 8,
      "Design": 8,
      "English": 5,
      "History": 5,
    },
    explanation: "Architecture requires Mathematics for structural calculations and Physics for understanding material properties. Art and Design develop aesthetic sense and creativity.",
  },
  {
    careerId: "finance",
    careerName: "Finance",
    requiredSubjects: ["Mathematics", "Economics"],
    recommendedSubjects: ["English", "Business Studies"],
    optionalSubjects: ["Computer Science", "Statistics"],
    subjectPriorities: {
      "Mathematics": 10,
      "Economics": 10,
      "English": 7,
      "Business Studies": 7,
      "Computer Science": 5,
      "Statistics": 6,
    },
    explanation: "Finance requires strong Mathematics for financial modeling and Economics for understanding market dynamics. English is essential for communication, while Business Studies provides industry context.",
  },
  {
    careerId: "teaching",
    careerName: "Teaching",
    requiredSubjects: ["English", "Mathematics"],
    recommendedSubjects: ["Science", "History"],
    optionalSubjects: ["Geography", "Art"],
    subjectPriorities: {
      "English": 10,
      "Mathematics": 10,
      "Science": 7,
      "History": 6,
      "Geography": 4,
      "Art": 4,
    },
    explanation: "Teaching requires strong English for communication and Mathematics for numeracy skills. Science and History provide subject knowledge for teaching.",
  },
];

/**
 * Get career subject mapping by career ID
 */
export function getCareerMapping(careerId: string): CareerSubjectMapping | null {
  return CAREER_SUBJECT_MAPPINGS.find(m => m.careerId === careerId) || null;
}

/**
 * Get career subject mapping by career name (case-insensitive)
 */
export function getCareerMappingByName(careerName: string): CareerSubjectMapping | null {
  return CAREER_SUBJECT_MAPPINGS.find(m => 
    m.careerName.toLowerCase() === careerName.toLowerCase()
  ) || null;
}

/**
 * Get subject priority for a career
 */
export function getSubjectPriority(careerId: string, subject: string): number {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return 0;
  return mapping.subjectPriorities[subject] || 0;
}

/**
 * Get career explanation
 */
export function getCareerExplanation(careerId: string): string {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return "";
  return mapping.explanation;
}

/**
 * Check if a subject is required for a career
 */
export function isSubjectRequired(careerId: string, subject: string): boolean {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return false;
  return mapping.requiredSubjects.includes(subject);
}

/**
 * Check if a subject is recommended for a career
 */
export function isSubjectRecommended(careerId: string, subject: string): boolean {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return false;
  return mapping.recommendedSubjects.includes(subject);
}

/**
 * Get all subjects for a career (required + recommended)
 */
export function getCareerSubjects(careerId: string): string[] {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return [];
  return [...mapping.requiredSubjects, ...mapping.recommendedSubjects];
}

/**
 * Get subject priority for multiple careers (returns max priority)
 */
export function getMaxSubjectPriority(careerIds: string[], subject: string): number {
  const priorities = careerIds.map(id => getSubjectPriority(id, subject));
  return Math.max(...priorities, 0);
}
