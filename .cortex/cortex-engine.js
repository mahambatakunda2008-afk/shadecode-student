const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");

const REPO_OWNER = "mahambatakunda2008-afk";
const REPO_NAME = "shadecode-student";
const BASE_BRANCH = "main";
const ENGINE_BRANCH = `cortex-auto-${Date.now()}`;
const TASK_FILE = ".cortex/tasks.md";
const MAX_IMPROVEMENTS = 1;
const MAX_CODE_BYTES = 200_000;
const ALLOWED_PREFIXES = ["src/"];
const FORBIDDEN_PATHS = new Set(["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".env", ".env.local", ".github/workflows/", ".cortex/"]);

for (const key of ["GITHUB_TOKEN", "GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const logs = [];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  logs.push(line);
}

function isAllowedPath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0 || filePath.length > 240) return false;
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\")) return false;
  if (FORBIDDEN_PATHS.has(filePath) || [...FORBIDDEN_PATHS].some((p) => filePath.startsWith(p))) return false;
  return ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function validateDecision(decision) {
  if (!decision || typeof decision !== "object") throw new Error("AI decision is not an object");
  if (typeof decision.analysis !== "string" || decision.analysis.length < 10) throw new Error("AI decision has invalid analysis");
  if (!Array.isArray(decision.improvements) || decision.improvements.length !== MAX_IMPROVEMENTS) {
    throw new Error(`Cortex must produce exactly ${MAX_IMPROVEMENTS} improvement per cycle`);
  }
  const item = decision.improvements[0];
  if (!item || typeof item !== "object") throw new Error("Invalid improvement object");
  if (!["new_feature", "new_component", "bug_fix", "refactor"].includes(item.type)) throw new Error("Invalid improvement type");
  if (!item.title || !item.description || !item.file_path || typeof item.code !== "string") throw new Error("Incomplete improvement");
  if (!isAllowedPath(item.file_path)) throw new Error(`Unsafe file path: ${item.file_path}`);
  if (Buffer.byteLength(item.code, "utf8") > MAX_CODE_BYTES) throw new Error("Generated file exceeds safety size limit");
  return decision;
}

async function checkForOpenCortexPRs() {
  const { data: prs } = await octokit.pulls.list({ owner: REPO_OWNER, repo: REPO_NAME, state: "open", per_page: 50 });
  const open = prs.filter((pr) => pr.head.ref.startsWith("cortex-auto-"));
  if (open.length) open.forEach((pr) => log(`Open Cortex PR blocks new work: #${pr.number} ${pr.title}`));
  return open;
}

async function readTaskRoadmap() {
  const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: TASK_FILE, ref: BASE_BRANCH });
  const content = Buffer.from(data.content, "base64").toString("utf8");
  const sectionMatch = content.match(/^## Immediate Execution Queue[\s\S]*?(?=^## |$)/m);
  const queue = sectionMatch ? sectionMatch[0] : "";
  const pendingTasks = [];
  const lines = queue.split("\n");
  let current = null;

  for (const line of lines) {
    const match = line.match(/^- \[ \] (🔴|🟡|🟢) \*\*(.+?)\*\*/);
    if (match) {
      if (current) pendingTasks.push(current);
      current = { priority: match[1], title: match[2].trim(), details: [] };
    } else if (current && /^\s{2,}- /.test(line)) {
      current.details.push(line.trim());
    }
  }
  if (current) pendingTasks.push(current);
  log(`Immediate queue: ${pendingTasks.length} executable pending task(s)`);
  return { raw: content, pendingTasks };
}

async function discoverSchema() {
  const candidates = ["profiles", "subjects", "study_topics", "tasks", "exams", "cortex_insights", "daily_challenges", "achievements", "timetable"];
  const schema = {};
  for (const table of candidates) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(0);
      if (!error && data !== null) schema[table] = { exists: true };
    } catch {}
  }
  log(`Schema check: ${Object.keys(schema).join(", ")}`);
  return schema;
}

async function gatherSignals(schema) {
  const signals = { counts: {}, insightCount: 0 };
  for (const table of ["profiles", "tasks", "study_topics", "exams", "cortex_insights"]) {
    if (!schema[table]) continue;
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (table === "cortex_insights") signals.insightCount = count ?? 0;
    else signals.counts[table] = count ?? 0;
  }
  return signals;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : text.trim();
  try { return JSON.parse(candidate); } catch {}
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return JSON");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function askAI(roadmap, schema, signals) {
  const task = roadmap.pendingTasks[0];
  const prompt = `You are Cortex Engineering for Shadecode Student. Execute exactly ONE task from the Immediate Execution Queue.\n\nTASK:\nPriority: ${task.priority}\nTitle: ${task.title}\nDetails:\n${task.details.join("\n") || "(none)"}\n\nVERIFIED TABLES:\n${Object.keys(schema).join(", ")}\n\nNON-SENSITIVE PRODUCT COUNTS:\n${JSON.stringify(signals)}\n\nRULES:\n- Work only on this task. Do not choose another task.\n- Produce exactly ONE improvement.\n- App code must be under src/.\n- Never create migrations or SQL.\n- Never create or modify package/config/CI files.\n- Never invent database tables.\n- Reuse existing systems when possible.\n- Return only JSON.\n- Code must be complete file content.\n\nJSON schema:\n{\n  "analysis": "short explanation",\n  "improvements": [{\n    "type": "new_feature | new_component | bug_fix | refactor",\n    "title": "short title",\n    "description": "what changes and why",\n    "priority": "high | medium | low",\n    "file_path": "src/...",\n    "code": "complete file content"\n  }],\n  "devlog_entry": "first-person short entry"\n}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  let rawText = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      rawText = (await model.generateContent(prompt)).response.text();
      break;
    } catch (error) {
      log(`Gemini attempt ${attempt} failed: ${error.message}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!rawText && process.env.OPENROUTER_API_KEY) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://shadecodestudent.vercel.app" },
      body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`);
    rawText = data.choices?.[0]?.message?.content ?? null;
  }

  if (!rawText) throw new Error("No AI provider returned a decision");
  const decision = validateDecision(extractJson(rawText));
  log(`Decision: ${decision.improvements[0].title} -> ${decision.improvements[0].file_path}`);
  return decision;
}

async function createBranch() {
  const { data: ref } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${BASE_BRANCH}` });
  await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${ENGINE_BRANCH}`, sha: ref.object.sha });
}

async function applyImprovement(improvement) {
  let existingSha;
  let existingContent = null;
  try {
    const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: improvement.file_path, ref: ENGINE_BRANCH });
    existingSha = data.sha;
    existingContent = Buffer.from(data.content, "base64").toString("utf8");
  } catch {}
  if (existingContent === improvement.code) throw new Error(`Generated change is identical to ${improvement.file_path}`);
  await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: improvement.file_path, message: `cortex: ${improvement.title}`, content: Buffer.from(improvement.code).toString("base64"), sha: existingSha, branch: ENGINE_BRANCH });
}

async function updateDevlog(decision) {
  let content = "# Shadecode Student — Cortex Devlog\n\n";
  let sha;
  try {
    const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: "DEVLOG.md", ref: ENGINE_BRANCH });
    content = Buffer.from(data.content, "base64").toString("utf8");
    sha = data.sha;
  } catch {}
  const date = new Date().toISOString().slice(0, 10);
  const item = decision.improvements[0];
  const entry = `\n## ${date} — Cortex Auto-Cycle\n\n${decision.devlog_entry}\n\n**Task:** ${item.title}\n\n**Change:** ${item.description}\n\n---\n`;
  await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: "DEVLOG.md", message: "cortex: update devlog", content: Buffer.from(content + entry).toString("base64"), sha, branch: ENGINE_BRANCH });
}

async function openPullRequest(decision) {
  const item = decision.improvements[0];
  const body = `## 🧠 Cortex Auto-Improvement\n\n**Task:** ${item.title}\n\n**Analysis:** ${decision.analysis}\n\n**Change:** \`${item.file_path}\`\n\n${item.description}\n\n### Safety\n- One improvement only\n- App path allowlist enforced\n- No schema/migration/config changes\n- Human review required before merge\n\n*Generated by Cortex Engineering.*`;
  const { data: pr } = await octokit.pulls.create({ owner: REPO_OWNER, repo: REPO_NAME, title: `🧠 Cortex: ${item.title}`, head: ENGINE_BRANCH, base: BASE_BRANCH, body });
  return pr.html_url;
}

async function main() {
  log("CORTEX ENGINE — cycle start");
  const open = await checkForOpenCortexPRs();
  if (open.length) {
    log("Cycle skipped: an earlier Cortex PR is still awaiting review.");
    return;
  }
  const roadmap = await readTaskRoadmap();
  if (!roadmap.pendingTasks.length) {
    log("No executable task in Immediate Execution Queue. No autonomous change made.");
    return;
  }
  const schema = await discoverSchema();
  const signals = await gatherSignals(schema);
  const decision = await askAI(roadmap, schema, signals);
  await createBranch();
  await applyImprovement(decision.improvements[0]);
  await updateDevlog(decision);
  const prUrl = await openPullRequest(decision);
  log(`Cortex PR opened: ${prUrl}`);
}

main().catch((error) => {
  log(`ERROR: ${error.message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `## ❌ Cortex Engine failed\n\n**Error:** ${error.message}\n\n\`\`\`\n${error.stack || ""}\n\`\`\``;
    require("fs").appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  process.exit(1);
});
