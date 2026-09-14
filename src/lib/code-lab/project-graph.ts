export type ProjectGraphLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "csharp"
  | "vbnet"
  | "c"
  | "cpp"
  | "sql"
  | "unknown";

export type ProjectGraphNode = {
  path: string;
  language: ProjectGraphLanguage;
  imports: string[];
  unresolvedImports: string[];
  dependents: string[];
};

export type ProjectGraph = {
  nodes: ProjectGraphNode[];
  edges: Array<{ from: string; to: string; specifier: string }>;
  entrypoints: string[];
  cycles: string[][];
};

type FileInput = { path: string; content: string };

const JS_RE = /(?:import\s+(?:[\s\S]*?\s+from\s+|)\"([^\"]+)\"|import\s*\(\s*\"([^\"]+)\"\s*\)|require\(\s*\"([^\"]+)\"\s*\)|export\s+(?:[\s\S]*?\s+from\s+)\"([^\"]+)\")/g;
const PY_RE = /(?:from\s+([.\w/]+)\s+import|import\s+([.\w/]+))/g;
const JVM_RE = /import\s+([\w.]+)\s*;/g;
const DOTNET_RE = /using\s+([\w.]+)\s*;/g;
const CPP_RE = /#include\s*[\"<]([^\">]+)[\">]/g;
const SQL_RE = /(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([A-Za-z_][\w.]*)/gi;

function languageFor(path: string): ProjectGraphLanguage {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "javascript";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "py") return "python";
  if (ext === "java" || ext === "kt" || ext === "kts") return "java";
  if (ext === "cs") return "csharp";
  if (ext === "vb") return "vbnet";
  if (ext === "c" || ext === "h") return "c";
  if (["cc", "cpp", "cxx", "hpp"].includes(ext ?? "")) return "cpp";
  if (ext === "sql") return "sql";
  return "unknown";
}

export function normalizeProjectPath(path: string) {
  const parts = path.replaceAll("\\", "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function relativeCandidates(from: string, specifier: string) {
  const base = normalizeProjectPath(`${from.split("/").slice(0, -1).join("/")}/${specifier}`);
  return [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.ts`, `${base}.tsx`, `${base}.py`, `${base}/index.js`, `${base}/index.ts`];
}

function extractImports(language: ProjectGraphLanguage, content: string) {
  const found: string[] = [];
  const add = (value?: string) => { if (value && !found.includes(value)) found.push(value); };
  const patterns = language === "javascript" || language === "typescript" ? [JS_RE] : language === "python" ? [PY_RE] : language === "java" ? [JVM_RE] : language === "csharp" || language === "vbnet" ? [DOTNET_RE] : language === "c" || language === "cpp" ? [CPP_RE] : language === "sql" ? [SQL_RE] : [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) add(match.slice(1).find(Boolean));
  }
  return found;
}

function resolveImport(from: string, specifier: string, files: Set<string>) {
  if (!specifier.startsWith(".")) return undefined;
  return relativeCandidates(from, specifier).find((candidate) => files.has(candidate));
}

export function buildProjectGraph(input: FileInput[]): ProjectGraph {
  const files = input.map((file) => ({ ...file, path: normalizeProjectPath(file.path) })).filter((file) => file.path);
  const fileSet = new Set(files.map((file) => file.path));
  const edges: ProjectGraph["edges"] = [];
  const nodeMap = new Map<string, ProjectGraphNode>();

  for (const file of files) {
    const language = languageFor(file.path);
    const imports = extractImports(language, file.content);
    const resolved: string[] = [];
    const unresolvedImports: string[] = [];
    for (const specifier of imports) {
      const target = resolveImport(file.path, specifier, fileSet);
      if (target) {
        resolved.push(target);
        edges.push({ from: file.path, to: target, specifier });
      } else if (specifier.startsWith(".")) {
        unresolvedImports.push(specifier);
      }
    }
    nodeMap.set(file.path, { path: file.path, language, imports: resolved, unresolvedImports, dependents: [] });
  }

  for (const edge of edges) nodeMap.get(edge.to)?.dependents.push(edge.from);
  const incoming = new Set(edges.map((edge) => edge.to));
  const entrypoints = files.map((file) => file.path).filter((path) => !incoming.has(path));
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(path: string) {
    if (visiting.has(path)) {
      const index = stack.indexOf(path);
      if (index >= 0) cycles.push([...stack.slice(index), path]);
      return;
    }
    if (visited.has(path)) return;
    visiting.add(path); stack.push(path);
    for (const target of nodeMap.get(path)?.imports ?? []) visit(target);
    stack.pop(); visiting.delete(path); visited.add(path);
  }
  for (const file of files) visit(file.path);

  return { nodes: [...nodeMap.values()], edges, entrypoints, cycles };
}
