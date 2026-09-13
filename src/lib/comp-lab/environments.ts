export type CompLabProjectType = "console" | "web" | "windows-forms" | "desktop" | "database" | "spreadsheet";

export type CompLabLanguage =
  | "javascript" | "typescript" | "python" | "csharp" | "vbnet"
  | "html" | "css" | "sql" | "json" | "markdown" | "xml";

export type CompLabCapabilityStatus = "browser" | "planned" | "external-runtime" | "artifact";

export type CompLabEnvironment = {
  id: string;
  label: string;
  projectType: CompLabProjectType;
  languages: CompLabLanguage[];
  description: string;
  status: CompLabCapabilityStatus;
  /** Broad computing areas. These are not exam-board claims. */
  curriculumTags: string[];
  /** Curriculum families where this environment may be relevant when the learner's syllabus exposes it. */
  curriculumContexts: string[];
  fileExtensions: string[];
};

/**
 * Comp Lab is curriculum-neutral at the product layer.
 * Board, level, syllabus, subject and objective are supplied by the learner's academic profile.
 */
export const COMP_LAB_ENVIRONMENTS: CompLabEnvironment[] = [
  { id: "javascript-console", label: "JavaScript Console", projectType: "console", languages: ["javascript", "typescript"], description: "Browser-safe console programming with files, modules and runtime diagnostics.", status: "browser", curriculumTags: ["programming", "algorithms", "web"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".js", ".mjs", ".ts"] },
  { id: "python-console", label: "Python Console", projectType: "console", languages: ["python"], description: "Python programming for algorithms, problem solving, data and practical work.", status: "planned", curriculumTags: ["programming", "algorithms", "problem-solving", "data"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".py"] },
  { id: "csharp-console", label: "C# Console App", projectType: "console", languages: ["csharp"], description: "C# console projects with a real .NET execution target when connected.", status: "external-runtime", curriculumTags: ["programming", "oop", "software-development"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".cs", ".csproj", ".sln"] },
  { id: "vbnet-console", label: "Visual Basic Console App", projectType: "console", languages: ["vbnet"], description: "Visual Basic .NET console projects for structured programming and Windows development.", status: "external-runtime", curriculumTags: ["programming", "visual-basic", "problem-solving"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".vb", ".vbproj", ".sln"] },
  { id: "csharp-windows-forms", label: "C# Windows Forms App", projectType: "windows-forms", languages: ["csharp"], description: "Desktop GUI projects with forms, controls, events and .NET project structure.", status: "external-runtime", curriculumTags: ["visual-programming", "gui", "event-driven-programming", "windows"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".cs", ".csproj", ".sln"] },
  { id: "vbnet-windows-forms", label: "VB.NET Windows Forms App", projectType: "windows-forms", languages: ["vbnet"], description: "Visual Basic Windows Forms projects with controls, events, forms and designer-aware structure.", status: "external-runtime", curriculumTags: ["visual-basic", "visual-programming", "gui", "event-driven-programming", "windows"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".vb", ".vbproj", ".sln"] },
  { id: "web", label: "Web Project", projectType: "web", languages: ["html", "css", "javascript", "typescript"], description: "HTML, CSS and JavaScript/TypeScript projects with browser preview and web workflow.", status: "browser", curriculumTags: ["web-design", "web-development", "html", "css", "javascript"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".html", ".css", ".js", ".mjs", ".ts"] },
  { id: "sql-database", label: "SQL Database Project", projectType: "database", languages: ["sql"], description: "Relational database design, queries, relationships and test data.", status: "planned", curriculumTags: ["databases", "sql", "relational-databases", "queries"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".sql"] },
  { id: "access-database", label: "Microsoft Access Project", projectType: "database", languages: ["sql"], description: "Access-style database projects covering tables, relationships, queries, forms and reports.", status: "artifact", curriculumTags: ["databases", "microsoft-access", "forms", "reports", "queries"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic"], fileExtensions: [".accdb", ".mdb"] },
  { id: "excel-workbook", label: "Excel Workbook", projectType: "spreadsheet", languages: [], description: "Spreadsheet projects for formulas, functions, data analysis, charts and practical problem solving.", status: "artifact", curriculumTags: ["spreadsheets", "microsoft-excel", "data-analysis", "formulas", "charts"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"], fileExtensions: [".xlsx", ".xlsm", ".csv"] },
];

export function getCompLabEnvironment(id: string) {
  return COMP_LAB_ENVIRONMENTS.find((environment) => environment.id === id) ?? null;
}

export function findCompLabEnvironmentForPath(path: string) {
  const lower = path.toLowerCase();
  return COMP_LAB_ENVIRONMENTS.find((environment) => environment.fileExtensions.some((extension) => lower.endsWith(extension))) ?? null;
}

export function isExecutableCompLabLanguage(language: CompLabLanguage) {
  return language === "javascript";
}
