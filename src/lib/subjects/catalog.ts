export type SubjectCategory =
  | "Mathematics & quantitative"
  | "Sciences & environment"
  | "Computing & technology"
  | "Languages & communication"
  | "Humanities & social sciences"
  | "Business & commerce"
  | "Creative & practical";

export interface SubjectCatalogEntry {
  id: string;
  name: string;
  category: SubjectCategory;
  pathways: readonly string[];
  aliases?: readonly string[];
}

/**
 * A selectable catalogue, not a claim that every syllabus or lesson is verified.
 * Keep curriculum verification and published-content readiness in their own systems.
 * IDs are stable learner-facing identifiers; custom subjects remain possible.
 */
const ALL_PATHWAYS = ["early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"] as const;
const SCHOOL_PATHWAYS = ["primary", "lower-secondary", "upper-secondary", "a-level"] as const;
const SECONDARY_PATHWAYS = ["lower-secondary", "upper-secondary", "a-level"] as const;
const HIGHER_PATHWAYS = ["university", "tvet", "professional", "independent"] as const;

export const SUBJECT_CATALOG: readonly SubjectCatalogEntry[] = [
  { id: "mathematics", name: "Mathematics", category: "Mathematics & quantitative", pathways: ALL_PATHWAYS, aliases: ["Maths", "Numeracy"] },
  { id: "additional-mathematics", name: "Additional Mathematics", category: "Mathematics & quantitative", pathways: SECONDARY_PATHWAYS },
  { id: "further-mathematics", name: "Further Mathematics", category: "Mathematics & quantitative", pathways: ["a-level", "university", "independent"] },
  { id: "statistics", name: "Statistics", category: "Mathematics & quantitative", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "quantitative-methods", name: "Quantitative Methods", category: "Mathematics & quantitative", pathways: HIGHER_PATHWAYS },
  { id: "technical-mathematics", name: "Technical Mathematics", category: "Mathematics & quantitative", pathways: ["tvet", "professional", "independent"] },
  { id: "integrated-science", name: "Integrated Science", category: "Sciences & environment", pathways: ["primary", "lower-secondary", "upper-secondary"] },
  { id: "general-science", name: "General Science", category: "Sciences & environment", pathways: ALL_PATHWAYS },
  { id: "biology", name: "Biology", category: "Sciences & environment", pathways: SCHOOL_PATHWAYS.concat(["university", "independent"]) },
  { id: "chemistry", name: "Chemistry", category: "Sciences & environment", pathways: SECONDARY_PATHWAYS.concat(["university", "independent"]) },
  { id: "physics", name: "Physics", category: "Sciences & environment", pathways: SECONDARY_PATHWAYS.concat(["university", "independent"]) },
  { id: "environmental-science", name: "Environmental Science", category: "Sciences & environment", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "agriculture", name: "Agriculture", category: "Sciences & environment", pathways: [...SCHOOL_PATHWAYS, "tvet", "independent"] },
  { id: "applied-science", name: "Applied Science", category: "Sciences & environment", pathways: ["upper-secondary", "university", "tvet", "professional", "independent"] },
  { id: "earth-science", name: "Earth Science", category: "Sciences & environment", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "astronomy", name: "Astronomy", category: "Sciences & environment", pathways: ["upper-secondary", "a-level", "university", "independent"] },
  { id: "computer-science", name: "Computer Science", category: "Computing & technology", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "ict", name: "ICT", category: "Computing & technology", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS], aliases: ["Information and Communication Technology"] },
  { id: "computing", name: "Computing", category: "Computing & technology", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "programming", name: "Programming / Coding", category: "Computing & technology", pathways: ALL_PATHWAYS },
  { id: "software-development", name: "Software Development", category: "Computing & technology", pathways: HIGHER_PATHWAYS },
  { id: "digital-literacy", name: "Digital Literacy", category: "Computing & technology", pathways: ALL_PATHWAYS },
  { id: "design-technology", name: "Design and Technology", category: "Computing & technology", pathways: [...SCHOOL_PATHWAYS, "tvet", "independent"] },
  { id: "english-language", name: "English Language", category: "Languages & communication", pathways: ALL_PATHWAYS, aliases: ["English"] },
  { id: "english-literature", name: "English Literature", category: "Languages & communication", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "reading-writing", name: "Reading and Writing", category: "Languages & communication", pathways: ALL_PATHWAYS },
  { id: "shona", name: "Shona", category: "Languages & communication", pathways: ALL_PATHWAYS },
  { id: "ndebele", name: "Ndebele", category: "Languages & communication", pathways: ALL_PATHWAYS },
  { id: "academic-writing", name: "Academic Writing", category: "Languages & communication", pathways: HIGHER_PATHWAYS },
  { id: "communication", name: "Communication Skills", category: "Languages & communication", pathways: HIGHER_PATHWAYS },
  { id: "history", name: "History", category: "Humanities & social sciences", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "geography", name: "Geography", category: "Humanities & social sciences", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "religious-studies", name: "Religious Studies", category: "Humanities & social sciences", pathways: SCHOOL_PATHWAYS },
  { id: "sociology", name: "Sociology", category: "Humanities & social sciences", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "psychology", name: "Psychology", category: "Humanities & social sciences", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "philosophy", name: "Philosophy", category: "Humanities & social sciences", pathways: HIGHER_PATHWAYS },
  { id: "global-perspectives", name: "Global Perspectives", category: "Humanities & social sciences", pathways: SCHOOL_PATHWAYS },
  { id: "social-studies", name: "Social Studies", category: "Humanities & social sciences", pathways: ["primary", "lower-secondary"] },
  { id: "business-studies", name: "Business Studies", category: "Business & commerce", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "business-management", name: "Business Management", category: "Business & commerce", pathways: HIGHER_PATHWAYS },
  { id: "economics", name: "Economics", category: "Business & commerce", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "accounting", name: "Accounting", category: "Business & commerce", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "commerce", name: "Commerce", category: "Business & commerce", pathways: [...SCHOOL_PATHWAYS, "tvet", "independent"] },
  { id: "entrepreneurship", name: "Entrepreneurship", category: "Business & commerce", pathways: HIGHER_PATHWAYS },
  { id: "finance", name: "Finance", category: "Business & commerce", pathways: HIGHER_PATHWAYS },
  { id: "marketing", name: "Marketing", category: "Business & commerce", pathways: HIGHER_PATHWAYS },
  { id: "art-design", name: "Art and Design", category: "Creative & practical", pathways: ALL_PATHWAYS },
  { id: "music", name: "Music", category: "Creative & practical", pathways: ALL_PATHWAYS },
  { id: "drama", name: "Drama", category: "Creative & practical", pathways: [...SCHOOL_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "media-studies", name: "Media Studies", category: "Creative & practical", pathways: [...SECONDARY_PATHWAYS, ...HIGHER_PATHWAYS] },
  { id: "physical-education", name: "Physical Education", category: "Creative & practical", pathways: SCHOOL_PATHWAYS },
  { id: "hospitality", name: "Hospitality", category: "Creative & practical", pathways: ["upper-secondary", "tvet", "professional", "independent"] },
  { id: "food-nutrition", name: "Food and Nutrition", category: "Creative & practical", pathways: SCHOOL_PATHWAYS },
];

export const SUBJECT_CATEGORIES: readonly SubjectCategory[] = [
  "Mathematics & quantitative",
  "Sciences & environment",
  "Computing & technology",
  "Languages & communication",
  "Humanities & social sciences",
  "Business & commerce",
  "Creative & practical",
];
