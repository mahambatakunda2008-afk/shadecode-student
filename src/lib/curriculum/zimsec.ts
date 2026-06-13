/**
 * /lib/curriculum/zimsec.ts
 *
 * ZIMSEC curriculum alignment
 */

import { CurriculumStandard, CurriculumTopic, Subject, CurriculumLevel, ExamStructure, PaperStructure, ExamSection } from "./types";

const ZIMSEC_MATHEMATICS_OLEVEL_TOPICS: CurriculumTopic[] = [
  {
    id: "zimsec-math-1",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Number Systems",
    subtopics: ["Integers", "Fractions", "Decimals", "Percentages", "Ratio and Proportion"],
    weight: 9,
    examFrequency: 9,
    difficulty: 6,
    prerequisites: [],
    learningObjectives: ["Understand number systems", "Perform calculations", "Solve word problems"],
    examWeight: 15,
  },
  {
    id: "zimsec-math-2",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Algebra",
    subtopics: ["Linear Equations", "Quadratic Equations", "Simultaneous Equations", "Inequalities"],
    weight: 10,
    examFrequency: 10,
    difficulty: 7,
    prerequisites: ["zimsec-math-1"],
    learningObjectives: ["Solve algebraic equations", "Factorize expressions", "Apply algebra to problems"],
    examWeight: 20,
  },
  {
    id: "zimsec-math-3",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Geometry",
    subtopics: ["Angles", "Triangles", "Circles", "Polygons", "Constructions"],
    weight: 8,
    examFrequency: 8,
    difficulty: 7,
    prerequisites: ["zimsec-math-1"],
    learningObjectives: ["Understand geometric properties", "Solve geometric problems", "Perform constructions"],
    examWeight: 15,
  },
  {
    id: "zimsec-math-4",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Trigonometry",
    subtopics: ["Trigonometric Ratios", "Pythagoras Theorem", "Sine and Cosine Rules", "3D Trigonometry"],
    weight: 7,
    examFrequency: 7,
    difficulty: 8,
    prerequisites: ["zimsec-math-3"],
    learningObjectives: ["Use trigonometric ratios", "Apply Pythagoras theorem", "Solve 3D problems"],
    examWeight: 12,
  },
  {
    id: "zimsec-math-5",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Statistics and Probability",
    subtopics: ["Data Representation", "Measures of Central Tendency", "Probability", "Cumulative Frequency"],
    weight: 6,
    examFrequency: 6,
    difficulty: 5,
    prerequisites: ["zimsec-math-1"],
    learningObjectives: ["Represent data", "Calculate averages", "Solve probability problems"],
    examWeight: 10,
  },
  {
    id: "zimsec-math-6",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Functions and Graphs",
    subtopics: ["Linear Functions", "Quadratic Functions", "Exponential Functions", "Graph Sketching"],
    weight: 7,
    examFrequency: 7,
    difficulty: 7,
    prerequisites: ["zimsec-math-2"],
    learningObjectives: ["Understand functions", "Sketch graphs", "Solve problems graphically"],
    examWeight: 13,
  },
  {
    id: "zimsec-math-7",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Matrices and Transformations",
    subtopics: ["Matrix Operations", "Determinants", "Transformations", "Inverse Matrices"],
    weight: 5,
    examFrequency: 5,
    difficulty: 8,
    prerequisites: ["zimsec-math-2"],
    learningObjectives: ["Perform matrix operations", "Understand transformations", "Solve matrix equations"],
    examWeight: 8,
  },
  {
    id: "zimsec-math-8",
    subject: "Mathematics",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Vectors",
    subtopics: ["Vector Notation", "Vector Operations", "Position Vectors", "Applications"],
    weight: 5,
    examFrequency: 5,
    difficulty: 8,
    prerequisites: ["zimsec-math-3"],
    learningObjectives: ["Understand vectors", "Perform vector operations", "Apply vectors to problems"],
    examWeight: 7,
  },
];

const ZIMSEC_SHONA_OLEVEL_TOPICS: CurriculumTopic[] = [
  {
    id: "zimsec-shona-1",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Zvivakadzivo (Noun Classes)",
    subtopics: ["Class prefixes", "Concord agreement", "Plural formation", "Possessives"],
    weight: 10,
    examFrequency: 10,
    difficulty: 7,
    prerequisites: [],
    learningObjectives: ["Understand noun classes", "Use correct prefixes", "Apply concord rules"],
    examWeight: 20,
  },
  {
    id: "zimsec-shona-2",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Mabasa eShona (Shona Verbs)",
    subtopics: ["Verb conjugation", "Tenses", "Moods", "Aspects"],
    weight: 9,
    examFrequency: 9,
    difficulty: 8,
    prerequisites: ["zimsec-shona-1"],
    learningObjectives: ["Conjugate verbs correctly", "Use appropriate tenses", "Understand verb aspects"],
    examWeight: 18,
  },
  {
    id: "zimsec-shona-3",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Kuverenga (Comprehension)",
    subtopics: ["Literal understanding", "Inferential understanding", "Vocabulary", "Context"],
    weight: 8,
    examFrequency: 8,
    difficulty: 6,
    prerequisites: ["zimsec-shona-1", "zimsec-shona-2"],
    learningObjectives: ["Read and understand texts", "Answer comprehension questions", "Analyze context"],
    examWeight: 15,
  },
  {
    id: "zimsec-shona-4",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Kunyora (Writing)",
    subtopics: ["Essay writing", "Letter writing", "Report writing", "Creative writing"],
    weight: 8,
    examFrequency: 8,
    difficulty: 7,
    prerequisites: ["zimsec-shona-1", "zimsec-shona-2"],
    learningObjectives: ["Write essays", "Write letters", "Write reports", "Use correct grammar"],
    examWeight: 15,
  },
  {
    id: "zimsec-shona-5",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Tsumo neMadzimairo (Proverbs and Idioms)",
    subtopics: ["Proverb meanings", "Idiom usage", "Cultural context", "Application"],
    weight: 7,
    examFrequency: 7,
    difficulty: 6,
    prerequisites: ["zimsec-shona-1"],
    learningObjectives: ["Understand proverbs", "Use idioms correctly", "Apply cultural knowledge"],
    examWeight: 12,
  },
  {
    id: "zimsec-shona-6",
    subject: "Shona",
    board: "ZIMSEC",
    level: "O-Level",
    topic: "Zvinyorwa zvedzidzo (Literature)",
    subtopics: ["Traditional texts", "Modern literature", "Themes", "Literary devices"],
    weight: 7,
    examFrequency: 7,
    difficulty: 7,
    prerequisites: ["zimsec-shona-3", "zimsec-shona-5"],
    learningObjectives: ["Analyze literature", "Identify themes", "Understand literary devices"],
    examWeight: 10,
  },
];

const ZIMSEC_EXAM_STRUCTURE: Record<string, ExamStructure> = {
  "Mathematics-O-Level-ZIMSEC": {
    paper1: {
      duration: 120,
      totalMarks: 100,
      sections: [
        {
          name: "Section A",
          marks: 50,
          questionTypes: ["Multiple Choice", "Short Answer"],
          topics: ["Number Systems", "Algebra", "Geometry"],
        },
        {
          name: "Section B",
          marks: 50,
          questionTypes: ["Structured Questions"],
          topics: ["Trigonometry", "Statistics", "Functions"],
        },
      ],
    },
    paper2: {
      duration: 120,
      totalMarks: 100,
      sections: [
        {
          name: "Section A",
          marks: 40,
          questionTypes: ["Problem Solving"],
          topics: ["Algebra", "Geometry", "Trigonometry"],
        },
        {
          name: "Section B",
          marks: 60,
          questionTypes: ["Extended Response"],
          topics: ["Functions", "Matrices", "Vectors"],
        },
      ],
    },
  },
  "Shona-O-Level-ZIMSEC": {
    paper1: {
      duration: 90,
      totalMarks: 100,
      sections: [
        {
          name: "Section A",
          marks: 40,
          questionTypes: ["Grammar", "Vocabulary"],
          topics: ["Zvivakadzivo", "Mabasa eShona"],
        },
        {
          name: "Section B",
          marks: 60,
          questionTypes: ["Comprehension"],
          topics: ["Kuverenga"],
        },
      ],
    },
    paper2: {
      duration: 90,
      totalMarks: 100,
      sections: [
        {
          name: "Section A",
          marks: 50,
          questionTypes: ["Essay Writing"],
          topics: ["Kunyora"],
        },
        {
          name: "Section B",
          marks: 50,
          questionTypes: ["Literature Analysis"],
          topics: ["Tsumo neMadzimairo", "Zvinyorwa zvedzidzo"],
        },
      ],
    },
  },
};

export function getZIMSECCurriculum(subject: Subject, level: CurriculumLevel): CurriculumStandard {
  const topics = subject === "Mathematics" ? ZIMSEC_MATHEMATICS_OLEVEL_TOPICS : 
                  subject === "Shona" ? ZIMSEC_SHONA_OLEVEL_TOPICS : [];
  
  const structure = ZIMSEC_EXAM_STRUCTURE[`${subject}-${level}-ZIMSEC`] || {
    paper1: {
      duration: 90,
      totalMarks: 100,
      sections: [],
    },
  };

  return {
    board: "ZIMSEC",
    level,
    subject,
    topics,
    totalTopics: topics.length,
    examStructure: structure,
  };
}

export function getZIMSECTopics(subject: Subject, level: CurriculumLevel): CurriculumTopic[] {
  const curriculum = getZIMSECCurriculum(subject, level);
  return curriculum.topics;
}

export function getZIMSECExamStructure(subject: Subject, level: CurriculumLevel): ExamStructure {
  const curriculum = getZIMSECCurriculum(subject, level);
  return curriculum.examStructure;
}
