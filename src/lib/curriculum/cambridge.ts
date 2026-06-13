/**
 * /lib/curriculum/cambridge.ts
 *
 * Cambridge curriculum alignment
 */

import { CurriculumStandard, CurriculumTopic, Subject, CurriculumLevel, ExamStructure } from "./types";

const CAMBRIDGE_MATHEMATICS_IGCSE_TOPICS: CurriculumTopic[] = [
  {
    id: "cambridge-math-1",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Number",
    subtopics: ["Integers, Fractions, Decimals", "Percentages", "Ratio and Proportion", "Standard Form"],
    weight: 9,
    examFrequency: 9,
    difficulty: 6,
    prerequisites: [],
    learningObjectives: ["Understand number systems", "Perform calculations", "Apply to real-world problems"],
    examWeight: 15,
  },
  {
    id: "cambridge-math-2",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Algebra and Graphs",
    subtopics: ["Algebraic Manipulation", "Equations and Formulae", "Linear Graphs", "Quadratic Graphs"],
    weight: 10,
    examFrequency: 10,
    difficulty: 7,
    prerequisites: ["cambridge-math-1"],
    learningObjectives: ["Manipulate algebraic expressions", "Solve equations", "Sketch and interpret graphs"],
    examWeight: 20,
  },
  {
    id: "cambridge-math-3",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Geometry",
    subtopics: ["Angles and Triangles", "Polygons", "Circles", "Constructions and Loci"],
    weight: 8,
    examFrequency: 8,
    difficulty: 7,
    prerequisites: ["cambridge-math-1"],
    learningObjectives: ["Understand geometric properties", "Solve geometric problems", "Perform constructions"],
    examWeight: 15,
  },
  {
    id: "cambridge-math-4",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Mensuration",
    subtopics: ["2D Shapes", " 3D Shapes", "Area and Perimeter", "Volume and Surface Area"],
    weight: 7,
    examFrequency: 7,
    difficulty: 6,
    prerequisites: ["cambridge-math-3"],
    learningObjectives: ["Calculate areas and perimeters", "Calculate volumes and surface areas", "Apply to real-world problems"],
    examWeight: 12,
  },
  {
    id: "cambridge-math-5",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Trigonometry",
    subtopics: ["Trigonometric Ratios", "Pythagoras Theorem", "Sine and Cosine Rules", "3D Problems"],
    weight: 7,
    examFrequency: 7,
    difficulty: 8,
    prerequisites: ["cambridge-math-3"],
    learningObjectives: ["Use trigonometric ratios", "Apply Pythagoras theorem", "Solve 3D trigonometry problems"],
    examWeight: 12,
  },
  {
    id: "cambridge-math-6",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Statistics and Probability",
    subtopics: ["Data Collection", "Averages and Spread", "Probability", "Cumulative Frequency"],
    weight: 6,
    examFrequency: 6,
    difficulty: 5,
    prerequisites: ["cambridge-math-1"],
    learningObjectives: ["Collect and represent data", "Calculate statistics", "Solve probability problems"],
    examWeight: 10,
  },
  {
    id: "cambridge-math-7",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Vectors and Transformations",
    subtopics: ["Vectors", "Transformations", "Matrices"],
    weight: 5,
    examFrequency: 5,
    difficulty: 8,
    prerequisites: ["cambridge-math-2"],
    learningObjectives: ["Understand vectors", "Perform transformations", "Use matrices"],
    examWeight: 8,
  },
  {
    id: "cambridge-math-8",
    subject: "Mathematics",
    board: "Cambridge",
    level: "IGCSE",
    topic: "Functions",
    subtopics: ["Function Notation", "Composite Functions", "Inverse Functions", "Graphs of Functions"],
    weight: 6,
    examFrequency: 6,
    difficulty: 8,
    prerequisites: ["cambridge-math-2"],
    learningObjectives: ["Understand function notation", "Find composite and inverse functions", "Sketch function graphs"],
    examWeight: 8,
  },
];

const CAMBRIDGE_EXAM_STRUCTURE: Record<string, ExamStructure> = {
  "Mathematics-IGCSE-Cambridge": {
    paper1: {
      duration: 120,
      totalMarks: 80,
      sections: [
        {
          name: "Section A",
          marks: 40,
          questionTypes: ["Short Answer"],
          topics: ["Number", "Algebra and Graphs", "Geometry"],
        },
        {
          name: "Section B",
          marks: 40,
          questionTypes: ["Structured Questions"],
          topics: ["Mensuration", "Trigonometry", "Statistics"],
        },
      ],
    },
    paper2: {
      duration: 120,
      totalMarks: 80,
      sections: [
        {
          name: "Section A",
          marks: 40,
          questionTypes: ["Problem Solving"],
          topics: ["Algebra and Graphs", "Geometry", "Trigonometry"],
        },
        {
          name: "Section B",
          marks: 40,
          questionTypes: ["Extended Response"],
          topics: ["Vectors and Transformations", "Functions"],
        },
      ],
    },
  },
};

export function getCambridgeCurriculum(subject: Subject, level: CurriculumLevel): CurriculumStandard {
  const topics = subject === "Mathematics" ? CAMBRIDGE_MATHEMATICS_IGCSE_TOPICS : [];
  
  const structure = CAMBRIDGE_EXAM_STRUCTURE[`${subject}-${level}-Cambridge`] || {
    paper1: {
      duration: 90,
      totalMarks: 100,
      sections: [],
    },
  };

  return {
    board: "Cambridge",
    level,
    subject,
    topics,
    totalTopics: topics.length,
    examStructure: structure,
  };
}

export function getCambridgeTopics(subject: Subject, level: CurriculumLevel): CurriculumTopic[] {
  const curriculum = getCambridgeCurriculum(subject, level);
  return curriculum.topics;
}

export function getCambridgeExamStructure(subject: Subject, level: CurriculumLevel): ExamStructure {
  const curriculum = getCambridgeCurriculum(subject, level);
  return curriculum.examStructure;
}
