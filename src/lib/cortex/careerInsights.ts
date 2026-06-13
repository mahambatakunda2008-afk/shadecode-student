/**
 * /lib/cortex/careerInsights.ts
 *
 * Cortex Career Insights
 * Generates career-aligned explanations for recommendations
 */

import { getCareerExplanation, getCareerMapping, getSubjectPriority } from "@/lib/careers/mapping";

export interface CareerInsight {
  careerId: string;
  careerName: string;
  subject: string;
  priority: number;
  explanation: string;
  alignmentReason: string;
}

/**
 * Generate career-aligned insight for a recommendation
 */
export function generateCareerInsight(
  careerId: string,
  subject: string,
  recommendationType: "lesson" | "revision" | "exam"
): CareerInsight | null {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return null;

  const priority = getSubjectPriority(careerId, subject);
  if (priority === 0) return null;

  const explanation = mapping.explanation;
  const alignmentReason = generateAlignmentReason(careerId, subject, recommendationType);

  return {
    careerId,
    careerName: mapping.careerName,
    subject,
    priority,
    explanation,
    alignmentReason,
  };
}

/**
 * Generate alignment reason for a recommendation
 */
function generateAlignmentReason(
  careerId: string,
  subject: string,
  recommendationType: "lesson" | "revision" | "exam"
): string {
  const mapping = getCareerMapping(careerId);
  if (!mapping) return "";

  const isRequired = mapping.requiredSubjects.includes(subject);
  const isRecommended = mapping.recommendedSubjects.includes(subject);

  const subjectName = subject.toLowerCase();
  const careerName = mapping.careerName.toLowerCase();

  if (isRequired) {
    switch (recommendationType) {
      case "lesson":
        return `${subject} is a required subject for ${mapping.careerName}. Mastering this subject is essential for your career path.`;
      case "revision":
        return `Strong performance in ${subject} is critical for ${mapping.careerName}. This revision will strengthen your foundation.`;
      case "exam":
        return `Excelling in ${subject} exams is required for ${mapping.careerName} qualifications. Focus on this area.`;
    }
  } else if (isRecommended) {
    switch (recommendationType) {
      case "lesson":
        return `${subject} is recommended for ${mapping.careerName}. This subject will enhance your skills and make you more competitive.`;
      case "revision":
        return `Improving your ${subject} skills will benefit your ${mapping.careerName} career. This revision will help you stand out.`;
      case "exam":
        return `Good ${subject} exam results will strengthen your ${mapping.careerName} applications. Practice this area.`;
    }
  }

  return `This ${subject} content supports your ${mapping.careerName} career goals.`;
}

/**
 * Generate career context for recommendations
 */
export function generateCareerContext(careerIds: string[]): string {
  if (careerIds.length === 0) return "";

  const mappings = careerIds.map(id => getCareerMapping(id)).filter(m => m !== null) as any[];
  
  if (mappings.length === 0) return "";

  const careerNames = mappings.map(m => m.careerName).join(" and ");
  const requiredSubjects = mappings.flatMap(m => m.requiredSubjects);
  const uniqueSubjects = [...new Set(requiredSubjects)];

  return `Based on your interest in ${careerNames}, the system prioritizes ${uniqueSubjects.join(", ")} as these are key subjects for your chosen career path.`;
}

/**
 * Check if a recommendation is career-aligned
 */
export function isCareerAligned(careerIds: string[], subject: string): boolean {
  if (careerIds.length === 0) return false;

  for (const careerId of careerIds) {
    const mapping = getCareerMapping(careerId);
    if (mapping) {
      if (mapping.requiredSubjects.includes(subject) || mapping.recommendedSubjects.includes(subject)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get career-aligned subjects
 */
export function getCareerAlignedSubjects(careerIds: string[]): string[] {
  if (careerIds.length === 0) return [];

  const subjects = new Set<string>();
  
  for (const careerId of careerIds) {
    const mapping = getCareerMapping(careerId);
    if (mapping) {
      mapping.requiredSubjects.forEach(s => subjects.add(s));
      mapping.recommendedSubjects.forEach(s => subjects.add(s));
    }
  }

  return Array.from(subjects);
}
