/**
 * Curriculum Mapper - Maps lessons to educational standards
 *
 * Supports:
 * - ZIMSEC (Zimbabwe School Examinations Council)
 * - Cambridge International Education
 * - Generic subject-topic hierarchies
 *
 * Purpose:
 * - Ensure lessons align with curriculum standards
 * - Track which outcomes are covered
 * - Generate coverage reports
 * - Recommend next topics based on learning path
 */

import { StructuredLesson } from "@/lib/cortex/templates";

export interface CurriculumOutcome {
  code: string; // e.g., "ZIMSEC-O-Level-Mathematics-1.1"
  description: string;
  assessmentCriteria: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface CurriculumFramework {
  name: string; // "ZIMSEC", "Cambridge", "Generic"
  version: string;
  subjects: Map<string, Subject>;
}

export interface Subject {
  id: string;
  name: string;
  topics: Map<string, Topic>;
  level?: string; // "O-Level", "A-Level", "GCSE"
}

export interface Topic {
  id: string;
  name: string;
  outcomes: CurriculumOutcome[];
  prerequisites?: string[]; // topic IDs
  estimatedHours: number;
  subTopics?: Map<string, Topic>;
}

export interface MappingResult {
  topic: Topic;
  outcomes: CurriculumOutcome[];
  alignmentScore: number; // 0-100
  recommendations: string[];
  prerequisitesMet: boolean;
}

export interface CoverageReport {
  subjectId: string;
  totalOutcomes: number;
  coveredOutcomes: number;
  coveragePercentage: number;
  gaps: string[]; // outcome codes not yet covered
  nextRecommendations: string[]; // topic IDs to generate next
  estimatedHoursRemaining: number;
}

/**
 * ZIMSEC Curriculum Framework
 * Standard secondary education curriculum for Zimbabwe
 */
const ZIMSEC_FRAMEWORK: CurriculumFramework = {
  name: "ZIMSEC",
  version: "2024",
  subjects: new Map([
    [
      "mathematics",
      {
        id: "math",
        name: "Mathematics",
        level: "O-Level",
        topics: new Map([
          [
            "numbers",
            {
              id: "numbers",
              name: "Number Systems",
              outcomes: [
                {
                  code: "ZIMSEC-Math-1.1",
                  description: "Understand natural numbers and integers",
                  assessmentCriteria: [
                    "Classify numbers",
                    "Perform arithmetic operations",
                  ],
                  difficulty: "beginner",
                },
                {
                  code: "ZIMSEC-Math-1.2",
                  description: "Work with fractions and decimals",
                  assessmentCriteria: [
                    "Convert between forms",
                    "Perform operations",
                  ],
                  difficulty: "beginner",
                },
              ],
              estimatedHours: 8,
              subTopics: new Map([
                [
                  "integers",
                  {
                    id: "integers",
                    name: "Integer Operations",
                    outcomes: [
                      {
                        code: "ZIMSEC-Math-1.1.1",
                        description: "Master integer arithmetic",
                        assessmentCriteria: ["Add", "Subtract", "Multiply"],
                        difficulty: "beginner",
                      },
                    ],
                    estimatedHours: 3,
                  },
                ],
                [
                  "fractions",
                  {
                    id: "fractions",
                    name: "Fractions",
                    outcomes: [
                      {
                        code: "ZIMSEC-Math-1.2.1",
                        description: "Work with fractions",
                        assessmentCriteria: [
                          "Simplify",
                          "Convert",
                          "Add/Subtract/Multiply",
                        ],
                        difficulty: "intermediate",
                      },
                    ],
                    estimatedHours: 5,
                    prerequisites: ["integers"],
                  },
                ],
              ]),
            },
          ],
          [
            "algebra",
            {
              id: "algebra",
              name: "Algebra",
              outcomes: [
                {
                  code: "ZIMSEC-Math-2.1",
                  description: "Understand algebraic expressions",
                  assessmentCriteria: ["Simplify", "Expand", "Factor"],
                  difficulty: "intermediate",
                },
              ],
              estimatedHours: 12,
              prerequisites: ["numbers"],
            },
          ],
          [
            "geometry",
            {
              id: "geometry",
              name: "Geometry",
              outcomes: [
                {
                  code: "ZIMSEC-Math-3.1",
                  description: "Understand angles and shapes",
                  assessmentCriteria: [
                    "Measure angles",
                    "Calculate areas",
                    "Classify shapes",
                  ],
                  difficulty: "intermediate",
                },
              ],
              estimatedHours: 10,
            },
          ],
        ]),
      },
    ],
    [
      "english",
      {
        id: "english",
        name: "English Language",
        level: "O-Level",
        topics: new Map([
          [
            "grammar",
            {
              id: "grammar",
              name: "Grammar",
              outcomes: [
                {
                  code: "ZIMSEC-Eng-1.1",
                  description: "Master parts of speech",
                  assessmentCriteria: [
                    "Identify",
                    "Categorize",
                    "Use correctly",
                  ],
                  difficulty: "beginner",
                },
              ],
              estimatedHours: 10,
            },
          ],
          [
            "writing",
            {
              id: "writing",
              name: "Writing Skills",
              outcomes: [
                {
                  code: "ZIMSEC-Eng-2.1",
                  description: "Compose effective essays",
                  assessmentCriteria: [
                    "Structure",
                    "Grammar",
                    "Coherence",
                    "Style",
                  ],
                  difficulty: "intermediate",
                },
              ],
              estimatedHours: 15,
              prerequisites: ["grammar"],
            },
          ],
        ]),
      },
    ],
    [
      "science",
      {
        id: "science",
        name: "Integrated Science",
        level: "O-Level",
        topics: new Map([
          [
            "biology",
            {
              id: "biology",
              name: "Biology",
              outcomes: [
                {
                  code: "ZIMSEC-Sci-1.1",
                  description: "Understand cell structure",
                  assessmentCriteria: [
                    "Identify organelles",
                    "Explain functions",
                    "Compare cells",
                  ],
                  difficulty: "beginner",
                },
              ],
              estimatedHours: 12,
            },
          ],
          [
            "chemistry",
            {
              id: "chemistry",
              name: "Chemistry",
              outcomes: [
                {
                  code: "ZIMSEC-Sci-2.1",
                  description: "Understand atomic structure",
                  assessmentCriteria: [
                    "Define atoms",
                    "Draw models",
                    "Explain bonding",
                  ],
                  difficulty: "intermediate",
                },
              ],
              estimatedHours: 14,
            },
          ],
          [
            "physics",
            {
              id: "physics",
              name: "Physics",
              outcomes: [
                {
                  code: "ZIMSEC-Sci-3.1",
                  description: "Understand forces and motion",
                  assessmentCriteria: [
                    "Calculate velocities",
                    "Draw diagrams",
                    "Apply Newton's laws",
                  ],
                  difficulty: "intermediate",
                },
              ],
              estimatedHours: 16,
            },
          ],
        ]),
      },
    ],
  ]),
};

/**
 * Cambridge International Education Framework
 */
const CAMBRIDGE_FRAMEWORK: CurriculumFramework = {
  name: "Cambridge",
  version: "2024",
  subjects: new Map([
    [
      "mathematics",
      {
        id: "math",
        name: "Cambridge IGCSE Mathematics (0580)",
        level: "IGCSE",
        topics: new Map([
          [
            "number-types",
            {
              id: "number-types",
              name: "Number Types and Operations",
              outcomes: [
                {
                  code: "CIE-Math-0580-1.1",
                  description:
                    "Know and use the properties of rational and irrational numbers",
                  assessmentCriteria: [
                    "Classify numbers",
                    "Perform operations",
                    "Compare",
                  ],
                  difficulty: "beginner",
                },
              ],
              estimatedHours: 6,
            },
          ],
        ]),
      },
    ],
  ]),
};

/**
 * Generic framework for custom subjects
 * Used when no standard curriculum applies
 */
function createGenericFramework(
  subjectName: string,
  topicHierarchy: Record<string, string[]>
): CurriculumFramework {
  const subjects = new Map<string, Subject>();

  const topicsMap = new Map<string, Topic>();
  for (const [topicName, subtopics] of Object.entries(topicHierarchy)) {
    const topic: Topic = {
      id: topicName.toLowerCase().replace(/\s+/g, "-"),
      name: topicName,
      outcomes: [
        {
          code: `GENERIC-${topicName}-1`,
          description: `Understand ${topicName}`,
          assessmentCriteria: ["Understand", "Apply", "Analyze"],
          difficulty: "intermediate",
        },
      ],
      estimatedHours: 10,
      subTopics: new Map(),
    };

    if (subtopics && subtopics.length > 0) {
      for (const subtopic of subtopics) {
        topic.subTopics!.set(subtopic.toLowerCase().replace(/\s+/g, "-"), {
          id: subtopic.toLowerCase().replace(/\s+/g, "-"),
          name: subtopic,
          outcomes: [
            {
              code: `GENERIC-${topicName}-${subtopic}-1`,
              description: `Understand ${subtopic}`,
              assessmentCriteria: ["Know", "Understand", "Apply"],
              difficulty: "beginner",
            },
          ],
          estimatedHours: 4,
        });
      }
    }

    topicsMap.set(topic.id, topic);
  }

  subjects.set(subjectName.toLowerCase(), {
    id: subjectName.toLowerCase(),
    name: subjectName,
    topics: topicsMap,
  });

  return {
    name: "Generic",
    version: "1.0",
    subjects,
  };
}

/**
 * Curriculum Mapper Service
 * Maps generated lessons to curriculum standards
 */
export class CurriculumMapper {
  private frameworks: Map<string, CurriculumFramework>;
  private lessonCoverage: Map<string, Set<string>>; // subjectId -> covered outcome codes

  constructor() {
    this.frameworks = new Map([
      ["ZIMSEC", ZIMSEC_FRAMEWORK],
      ["Cambridge", CAMBRIDGE_FRAMEWORK],
    ]);
    this.lessonCoverage = new Map();
  }

  /**
   * Map a generated lesson to curriculum outcomes
   */
  async mapLessonToCurriculum(
    lesson: StructuredLesson,
    subjectId: string,
    topicId: string,
    framework: string = "ZIMSEC"
  ): Promise<MappingResult> {
    const fw = this.frameworks.get(framework);
    if (!fw) {
      throw new Error(`Curriculum framework '${framework}' not found`);
    }

    // Find the subject and topic
    const subject = fw.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject '${subjectId}' not found in ${framework}`);
    }

    const topic = subject.topics.get(topicId);
    if (!topic) {
      throw new Error(`Topic '${topicId}' not found in subject '${subjectId}'`);
    }

    // Calculate alignment score based on lesson content
    const alignmentScore = this.calculateAlignment(lesson, topic);

    // Check prerequisites
    const prerequisitesMet = await this.checkPrerequisites(
      topicId,
      subjectId,
      framework
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(topic);

    // Track coverage
    this.trackCoverage(subjectId, topic.outcomes.map((o) => o.code));

    return {
      topic,
      outcomes: topic.outcomes,
      alignmentScore,
      recommendations,
      prerequisitesMet,
    };
  }

  /**
   * Calculate how well lesson content aligns with topic outcomes
   */
  private calculateAlignment(lesson: StructuredLesson, topic: Topic): number {
    let score = 50; // base score

    // Check if lesson title mentions topic name
    if (
      lesson.title.toLowerCase().includes(topic.name.toLowerCase()) ||
      topic.name.toLowerCase().includes(lesson.title.toLowerCase())
    ) {
      score += 20;
    }

    // Check for outcomes keywords in lesson content
    const contentText = JSON.stringify(lesson)
      .toLowerCase();
    let keywordMatches = 0;
    for (const outcome of topic.outcomes) {
      const keywords = outcome.description.toLowerCase().split(/\s+/);
      for (const keyword of keywords) {
        if (keyword.length > 4 && contentText.includes(keyword)) {
          keywordMatches++;
        }
      }
    }

    // Increase score based on keyword density
    score += Math.min(20, keywordMatches * 3);

    // Check for assessment criteria coverage
    if (
      lesson.sections &&
      lesson.sections.some((s) => s.examples && s.examples.length > 0)
    ) {
      score += 5; // has examples
    }

    if (
      lesson.sections &&
      lesson.sections.some((s) => s.keyPoints && s.keyPoints.length > 0)
    ) {
      score += 5; // has key points
    }

    return Math.min(100, score);
  }

  /**
   * Check if prerequisites for a topic are met
   */
  private async checkPrerequisites(
    topicId: string,
    subjectId: string,
    framework: string
  ): Promise<boolean> {
    const fw = this.frameworks.get(framework);
    if (!fw) return false;

    const subject = fw.subjects.get(subjectId);
    if (!subject) return false;

    const topic = subject.topics.get(topicId);
    if (!topic || !topic.prerequisites) return true;

    const covered = this.lessonCoverage.get(subjectId) || new Set();

    for (const prereq of topic.prerequisites) {
      const prereqTopic = subject.topics.get(prereq);
      if (prereqTopic) {
        // Check if all prerequisite outcomes are covered
        const allCovered = prereqTopic.outcomes.every((o) =>
          covered.has(o.code)
        );
        if (!allCovered) return false;
      }
    }

    return true;
  }

  /**
   * Generate learning recommendations based on topic
   */
  private generateRecommendations(topic: Topic): string[] {
    const recommendations = [];

    if (topic.outcomes) {
      for (const outcome of topic.outcomes) {
        if (outcome.assessmentCriteria && outcome.assessmentCriteria.length > 0) {
          recommendations.push(
            `Practice: ${outcome.assessmentCriteria[0]}`
          );
        }
      }
    }

    if (topic.subTopics && topic.subTopics.size > 0) {
      const nextSubtopic = Array.from(topic.subTopics.values())[0];
      recommendations.push(
        `Next: Learn "${nextSubtopic.name}" (${nextSubtopic.estimatedHours}h)`
      );
    }

    return recommendations;
  }

  /**
   * Track which outcomes have been covered
   */
  private trackCoverage(subjectId: string, outcomes: string[]): void {
    if (!this.lessonCoverage.has(subjectId)) {
      this.lessonCoverage.set(subjectId, new Set());
    }

    const covered = this.lessonCoverage.get(subjectId)!;
    for (const outcome of outcomes) {
      covered.add(outcome);
    }
  }

  /**
   * Get coverage report for a subject
   */
  async getCoverageReport(
    subjectId: string,
    framework: string = "ZIMSEC"
  ): Promise<CoverageReport> {
    const fw = this.frameworks.get(framework);
    if (!fw) {
      throw new Error(`Framework '${framework}' not found`);
    }

    const subject = fw.subjects.get(subjectId);
    if (!subject) {
      throw new Error(`Subject '${subjectId}' not found`);
    }

    // Count total outcomes
    let totalOutcomes = 0;
    let totalHours = 0;
    const allOutcomes = new Set<string>();

    const countOutcomes = (topic: Topic) => {
      totalOutcomes += topic.outcomes.length;
      totalHours += topic.estimatedHours;
      for (const outcome of topic.outcomes) {
        allOutcomes.add(outcome.code);
      }
      if (topic.subTopics) {
        for (const subtopic of topic.subTopics.values()) {
          countOutcomes(subtopic);
        }
      }
    };

    for (const topic of subject.topics.values()) {
      countOutcomes(topic);
    }

    // Get covered outcomes
    const covered = this.lessonCoverage.get(subjectId) || new Set();
    const coveredOutcomes = covered.size;

    // Calculate gaps
    const gaps = Array.from(allOutcomes).filter((code) => !covered.has(code));

    // Get next recommendations
    const nextRecommendations = this.getNextTopicRecommendations(
      subject,
      covered
    );

    // Estimate remaining hours
    const coveredHours = nextRecommendations.length > 0 ? totalHours * 0.5 : 0;
    const remainingHours = Math.max(0, totalHours - coveredHours);

    return {
      subjectId,
      totalOutcomes,
      coveredOutcomes,
      coveragePercentage: (coveredOutcomes / totalOutcomes) * 100,
      gaps,
      nextRecommendations,
      estimatedHoursRemaining: remainingHours,
    };
  }

  /**
   * Get next topics to learn based on learning path
   */
  private getNextTopicRecommendations(
    subject: Subject,
    covered: Set<string>
  ): string[] {
    const recommendations = [];

    for (const topic of subject.topics.values()) {
      // Check if prerequisites are met
      const prereqsMet =
        !topic.prerequisites ||
        topic.prerequisites.length === 0 ||
        topic.prerequisites.every((prereq) => {
          const prereqTopic = subject.topics.get(prereq);
          return (
            prereqTopic &&
            prereqTopic.outcomes.every((o) => covered.has(o.code))
          );
        });

      if (prereqsMet && topic.outcomes.some((o) => !covered.has(o.code))) {
        recommendations.push(topic.id);
      }
    }

    return recommendations;
  }

  /**
   * Add custom framework
   */
  addFramework(framework: CurriculumFramework): void {
    this.frameworks.set(framework.name, framework);
  }

  /**
   * Get all available frameworks
   */
  getAvailableFrameworks(): string[] {
    return Array.from(this.frameworks.keys());
  }

  /**
   * Reset coverage for fresh tracking
   */
  resetCoverage(subjectId: string): void {
    this.lessonCoverage.delete(subjectId);
  }
}

export { createGenericFramework };
