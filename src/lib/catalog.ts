export type CourseCategory =
  | "Primary School"
  | "Secondary School"
  | "University"
  | "Technology"
  | "Business"
  | "Languages"
  | "Arts"
  | "Test Preparation"
  | "Professional Skills";

export type Course = {
  id: string; // stable id used client-side
  title: string;
  category: CourseCategory;
  shortDescription: string;
  lessons: number;
  xpEstimate?: number;
  image?: string;
};

// Lightweight catalog (reuseable, fast-loading). Content can be extended.
export const CATALOG: Course[] = [
  { id: "math-foundations", title: "Mathematics Foundations", category: "Secondary School", shortDescription: "Core arithmetic, algebra and geometry foundations.", lessons: 18, xpEstimate: 350 },
  { id: "algebra-foundations", title: "Algebra Foundations", category: "Secondary School", shortDescription: "Equations, functions, and graphs to master algebraic thinking.", lessons: 12, xpEstimate: 240 },
  { id: "calculus-1", title: "Calculus I", category: "University", shortDescription: "Limits, derivatives, and introductory integrals.", lessons: 20, xpEstimate: 480 },
  { id: "python-basics", title: "Python Programming", category: "Technology", shortDescription: "Intro to Python, data types, control flow and functions.", lessons: 14, xpEstimate: 300 },
  { id: "web-dev", title: "Web Development", category: "Technology", shortDescription: "HTML, CSS, and JavaScript fundamentals for building web apps.", lessons: 22, xpEstimate: 520 },
  { id: "business-101", title: "Business Basics", category: "Business", shortDescription: "Intro to business models, finance basics and entrepreneurship.", lessons: 10, xpEstimate: 200 },
  { id: "english-fluency", title: "English Fluency", category: "Languages", shortDescription: "Speaking, reading and writing practice for improved fluency.", lessons: 16, xpEstimate: 360 },
  { id: "graphic-design", title: "Graphic Design", category: "Arts", shortDescription: "Principles of design, color, and layout with practical projects.", lessons: 12, xpEstimate: 260 },
  { id: "sat-prep", title: "SAT Test Preparation", category: "Test Preparation", shortDescription: "Targeted practice for SAT math and evidence-based reading.", lessons: 30, xpEstimate: 700 },
  { id: "project-management", title: "Project Management", category: "Professional Skills", shortDescription: "Agile basics, planning, and stakeholder communication.", lessons: 8, xpEstimate: 180 },
];
