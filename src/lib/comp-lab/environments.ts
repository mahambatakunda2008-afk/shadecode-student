export type CompLabProjectType = "console" | "web" | "windows-forms" | "desktop" | "database" | "spreadsheet" | "mobile" | "systems";

export type CompLabLanguage =
  | "javascript" | "typescript" | "python" | "csharp" | "vbnet" | "java" | "c" | "cpp" | "kotlin" | "php" | "rust" | "go"
  | "html" | "css" | "sql" | "json" | "markdown" | "xml" | "pseudocode";

export type CompLabCapabilityStatus = "browser" | "planned" | "external-runtime" | "artifact";

export type CompLabEnvironment = {
  id: string;
  label: string;
  projectType: CompLabProjectType;
  languages: CompLabLanguage[];
  description: string;
  status: CompLabCapabilityStatus;
  curriculumTags: string[];
  curriculumContexts: string[];
  fileExtensions: string[];
};

const ALL_CONTEXTS = ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"];

export const COMP_LAB_ENVIRONMENTS: CompLabEnvironment[] = [
  { id: "javascript-console", label: "JavaScript Console", projectType: "console", languages: ["javascript"], description: "Browser-safe JavaScript projects with files, modules and runtime diagnostics.", status: "browser", curriculumTags: ["programming", "algorithms", "web"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".js", ".mjs"] },
  { id: "typescript-console", label: "TypeScript", projectType: "console", languages: ["typescript"], description: "TypeScript projects transpiled with the TypeScript compiler and executed in the browser runtime.", status: "browser", curriculumTags: ["programming", "web", "software-development"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".ts", ".tsx"] },
  { id: "python-console", label: "Python", projectType: "console", languages: ["python"], description: "Python projects executed with CPython-compatible Pyodide in the browser.", status: "browser", curriculumTags: ["programming", "algorithms", "data", "problem-solving"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".py"] },
  { id: "java-console", label: "Java", projectType: "console", languages: ["java"], description: "Java projects targeting a real JVM runtime on a native or remote node.", status: "external-runtime", curriculumTags: ["programming", "oop", "algorithms"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".java"] },
  { id: "c-console", label: "C", projectType: "systems", languages: ["c"], description: "C projects targeting a real native compiler on a native or remote node.", status: "external-runtime", curriculumTags: ["programming", "systems", "algorithms"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".c", ".h"] },
  { id: "cpp-console", label: "C++", projectType: "systems", languages: ["cpp"], description: "C++ projects targeting a real native compiler on a native or remote node.", status: "external-runtime", curriculumTags: ["programming", "oop", "systems"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".cpp", ".cc", ".cxx", ".hpp"] },
  { id: "csharp-console", label: "C# Console App", projectType: "console", languages: ["csharp"], description: "C# console projects targeting real .NET execution on a native or remote node.", status: "external-runtime", curriculumTags: ["programming", "oop", "software-development"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".cs", ".csproj", ".sln"] },
  { id: "vbnet-console", label: "Visual Basic .NET", projectType: "console", languages: ["vbnet"], description: "Visual Basic .NET console projects targeting real .NET execution on a native or remote node.", status: "external-runtime", curriculumTags: ["programming", "visual-basic", "problem-solving"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".vb", ".vbproj"] },
  { id: "csharp-windows-forms", label: "C# Windows Forms", projectType: "windows-forms", languages: ["csharp"], description: "Real Windows Forms desktop projects with controls, events and designer-aware structure.", status: "external-runtime", curriculumTags: ["gui", "event-driven-programming", "windows"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".cs", ".csproj", ".sln"] },
  { id: "vbnet-windows-forms", label: "VB.NET Windows Forms", projectType: "windows-forms", languages: ["vbnet"], description: "Visual Basic Windows Forms projects with controls, events and designer-aware structure.", status: "external-runtime", curriculumTags: ["visual-basic", "gui", "event-driven-programming", "windows"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".vb", ".vbproj", ".sln"] },
  { id: "web", label: "Web Project", projectType: "web", languages: ["html", "css", "javascript", "typescript"], description: "HTML, CSS and JavaScript/TypeScript web projects with browser preview.", status: "browser", curriculumTags: ["web-design", "web-development", "html", "css", "javascript"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".html", ".htm", ".css", ".js", ".mjs", ".ts", ".tsx"] },
  { id: "sql-database", label: "SQL Database", projectType: "database", languages: ["sql"], description: "Relational database projects executed against an isolated SQLite-compatible SQL engine in the browser.", status: "browser", curriculumTags: ["databases", "sql", "queries", "relational-databases"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".sql"] },
  { id: "access-database", label: "Microsoft Access", projectType: "database", languages: ["sql"], description: "Access-style projects covering tables, relationships, queries, forms and reports. Native Access artifact support remains required for full fidelity.", status: "artifact", curriculumTags: ["databases", "microsoft-access", "forms", "reports"], curriculumContexts: ["school", "secondary", "sixth-form", "university", "polytechnic"], fileExtensions: [".accdb", ".mdb"] },
  { id: "excel-workbook", label: "Excel Workbook", projectType: "spreadsheet", languages: [], description: "Spreadsheet artifacts for formulas, functions, analysis, charts and practical work.", status: "artifact", curriculumTags: ["spreadsheets", "microsoft-excel", "data-analysis", "formulas"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".xlsx", ".xlsm", ".xls", ".csv"] },
  { id: "pseudocode", label: "Pseudocode & Algorithms", projectType: "console", languages: ["pseudocode"], description: "Board-neutral algorithm design, trace tables and structured pseudocode.", status: "browser", curriculumTags: ["algorithms", "pseudocode", "trace-tables", "problem-solving"], curriculumContexts: ALL_CONTEXTS, fileExtensions: [".pseudo", ".pseudocode", ".txt"] },
];

export function getCompLabEnvironment(id: string) { return COMP_LAB_ENVIRONMENTS.find((environment) => environment.id === id) ?? null; }
export function findCompLabEnvironmentForPath(path: string) {
  const lower = path.toLowerCase();
  return COMP_LAB_ENVIRONMENTS.find((environment) => environment.fileExtensions.some((extension) => lower.endsWith(extension))) ?? null;
}
export function isExecutableCompLabLanguage(language: CompLabLanguage) { return ["javascript", "typescript", "python", "sql"].includes(language); }
