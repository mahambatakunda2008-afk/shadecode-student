/**
 * CORTEX ENGINE
 * Autonomous self-improvement agent for Shadecode Student
 * Powered by Gemini 2.5 | Runs on GitHub Actions
 * Repo: mahambatakunda2008-afk/shadecode-student
 */

const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "mahambatakunda2008-afk";
const REPO_NAME = "shadecode-student";
const BASE_BRANCH = "main";
const ENGINE_BRANCH = `cortex-auto-${Date.now()}`;

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ── Logging ───────────────────────────────────────────────────────────────────
const logs = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logs.push(line);
}

// ── Step 1: Discover Supabase schema ─────────────────────────────────────────
async function discoverSchema() {
  log("Discovering Supabase schema...");
  const tables = {};

  // Try known tables + let Supabase tell us what exists
  const candidates = [
    "users", "insights", "tasks", "xp", "streaks",
    "subjects", "sessions", "activity", "notifications", "badges"
  ];

  for (const table of candidates) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(3);
      if (!error && data !== null) {
        tables[table] = {
          exists: true,
          sampleCount: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          sample: data.slice(0, 2),
        };
        log(`  ✓ Found table: ${table} (${data.length} sample rows)`);
      }
    } catch {
      // table doesn't exist, skip
    }
  }

  log(`Schema discovery complete. Found: ${Object.keys(tables).join(", ")}`);
  return tables;
}

// ── Step 2: Gather behavioral signals ────────────────────────────────────────
async function gatherSignals(schema) {
  log("Gathering behavioral signals from Supabase...");
  const signals = {};

  if (schema.insights) {
    const { data } = await supabase
      .from("insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    signals.recentInsights = data || [];
    log(`  Insights loaded: ${signals.recentInsights.length}`);
  }

  if (schema.users) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .limit(20);
    signals.userStats = data || [];
    log(`  Users loaded: ${signals.userStats.length}`);
  }

  // Load any other tables that exist
  for (const [table, meta] of Object.entries(schema)) {
    if (!["insights", "users"].includes(table) && meta.exists) {
      const { data } = await supabase.from(table).select("*").limit(20);
      signals[table] = data || [];
      log(`  ${table} loaded: ${signals[table].length} rows`);
    }
  }

  return signals;
}

// ── Step 2.5: Read tasks.md from repo ────────────────────────────────────────
async function readTaskRoadmap() {
  log("Reading tasks.md from repo...");
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: ".cortex/tasks.md",
      ref: BASE_BRANCH,
    });
    const content = Buffer.from(data.content, "base64").toString("utf8");
    // Extract pending tasks
    const pendingTasks = [];
    const lines = content.split("\n");
    let currentTask = null;
    for (const line of lines) {
      if (line.match(/- \[ \] (🔴|🟡|🟢)/)) {
        if (currentTask) pendingTasks.push(currentTask);
        currentTask = { title: line.replace(/- \[ \] (🔴|🟡|🟢) /, "").trim(), details: [] };
      } else if (currentTask && line.trim().startsWith("-")) {
        currentTask.details.push(line.trim());
      } else if (currentTask && line.trim() === "") {
        pendingTasks.push(currentTask);
        currentTask = null;
      }
    }
    log(`  Pending tasks found: ${pendingTasks.length}`);
    return { raw: content, pendingTasks };
  } catch {
    log("  tasks.md not found — Cortex will decide freely");
    return { raw: "", pendingTasks: [] };
  }
}

// ── Step 3: Ask Gemini what to improve ───────────────────────────────────────
async function analyzeAndDecide(schema, signals, roadmap) {
  log("Consulting Gemini 2.5 for improvement decisions...");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const schemaDesc = Object.entries(schema)
    .map(([t, m]) => `${t}: columns=[${m.columns.join(", ")}]`)
    .join("\n");

  const insightSample = signals.recentInsights?.slice(0, 5) || [];

  const nextTasks = roadmap.pendingTasks.slice(0, 3).map((t, i) => `${i + 1}. ${t.title}\n${t.details.join("\n")}`).join("\n\n");

  const prompt = `
You are Cortex Engine, the autonomous self-improvement agent for Shadecode Student.
Shadecode Student is a Next.js + Supabase learning platform where Cortex (powered by Gemini) 
observes student study behavior and reflects patterns back to them as neutral insights.

CURRENT DATABASE SCHEMA:
${schemaDesc}

RECENT INSIGHTS SAMPLE:
${JSON.stringify(insightSample, null, 2)}

CURRENT TASK ROADMAP (work on these in order):
${nextTasks || "No tasks defined — use your judgment"}

BEHAVIORAL SIGNALS SUMMARY:
- Total users: ${signals.userStats?.length || "unknown"}
- Recent insights generated: ${signals.recentInsights?.length || 0}
- Other active tables: ${Object.keys(signals).filter(k => !["recentInsights","userStats"].includes(k)).join(", ")}

YOUR TASK:
Analyze the current state of Shadecode Student and decide what to improve.
Produce a JSON response with this exact structure:

{
  "analysis": "2-3 sentence neutral analysis of what the behavioral data reveals",
  "improvements": [
    {
      "type": "prompt_improvement | new_feature | bug_fix | refactor | new_component",
      "title": "Short title",
      "description": "What to change and why",
      "priority": "high | medium | low",
      "file_path": "relative path in repo e.g. lib/cortex/prompts.js",
      "code": "complete file content to write"
    }
  ],
  "devlog_entry": "A short developer log entry describing what Cortex did this cycle"
}

Rules:
- Max 3 improvements per cycle to stay within rate limits
- Focus on highest-impact changes first
- Code must be production-ready Next.js/Node.js using ES modules (import/export syntax)
- IMPORTANT: This project uses a src/ directory structure. All app code goes under src/. For example: src/app/, src/lib/, src/components/ — never app/, lib/, components/ at the root
- IMPORTANT: lib/ files must be simple Next.js modules. Never import @google/generative-ai, @octokit/rest, fs, or path in app code — those are engine-only packages
- IMPORTANT: Use @supabase/supabase-js directly in API routes, not @supabase/auth-helpers-nextjs
- IMPORTANT: All exports must be named exports using ES module syntax e.g. export async function generateInsight()
- Prefer improving Cortex's own insight generation quality
- devlog_entry should be written in first person as Cortex
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini did not return valid JSON");

  const decision = JSON.parse(jsonMatch[0]);
  log(`Analysis: ${decision.analysis}`);
  log(`Improvements planned: ${decision.improvements.length}`);
  decision.improvements.forEach(i => log(`  → [${i.priority}] ${i.title}`));

  return decision;
}

// ── Step 4: Apply improvements to GitHub ─────────────────────────────────────
async function applyImprovements(decision) {
  log("Applying improvements to GitHub...");

  // Get base branch SHA
  const { data: ref } = await octokit.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BASE_BRANCH}`,
  });
  const baseSha = ref.object.sha;

  // Create new branch
  await octokit.git.createRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `refs/heads/${ENGINE_BRANCH}`,
    sha: baseSha,
  });
  log(`Created branch: ${ENGINE_BRANCH}`);

  // Commit each improvement
  for (const improvement of decision.improvements) {
    if (!improvement.code || !improvement.file_path) continue;

    const content = Buffer.from(improvement.code).toString("base64");

    // Check if file exists
    let fileSha;
    try {
      const { data: existing } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: improvement.file_path,
        ref: ENGINE_BRANCH,
      });
      fileSha = existing.sha;
    } catch {
      fileSha = undefined; // new file
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: improvement.file_path,
      message: `cortex: ${improvement.title}`,
      content,
      sha: fileSha,
      branch: ENGINE_BRANCH,
    });

    log(`  Committed: ${improvement.file_path}`);
  }

  return baseSha;
}

// ── Step 5: Update DEVLOG.md ──────────────────────────────────────────────────
async function updateDevlog(decision) {
  log("Updating DEVLOG.md...");

  const date = new Date().toISOString().split("T")[0];
  const entry = `\n## ${date} — Cortex Auto-Cycle\n\n${decision.devlog_entry}\n\n**Improvements this cycle:**\n${decision.improvements.map(i => `- [${i.priority.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")}\n\n---\n`;

  // Get existing devlog or create new
  let existingContent = `# Shadecode Student — Cortex Devlog\n\nAutonomous improvement log maintained by Cortex Engine.\n\n---\n`;
  let fileSha;

  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "DEVLOG.md",
      ref: ENGINE_BRANCH,
    });
    existingContent = Buffer.from(data.content, "base64").toString("utf8");
    fileSha = data.sha;
  } catch {
    fileSha = undefined;
  }

  const updatedContent = existingContent + entry;

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: "DEVLOG.md",
    message: "cortex: update devlog",
    content: Buffer.from(updatedContent).toString("base64"),
    sha: fileSha,
    branch: ENGINE_BRANCH,
  });

  log("DEVLOG.md updated.");
}

// ── Step 6: Open Pull Request ─────────────────────────────────────────────────
async function openPullRequest(decision) {
  log("Opening Pull Request...");

  const body = `## 🧠 Cortex Auto-Improvement

**Analysis:**
${decision.analysis}

**Changes in this PR:**
${decision.improvements.map(i => `- **[${i.priority.toUpperCase()}]** \`${i.file_path}\` — ${i.title}: ${i.description}`).join("\n")}

**Devlog:**
${decision.devlog_entry}

---
*This PR was generated autonomously by Cortex Engine. Review before merging.*`;

  const { data: pr } = await octokit.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: `🧠 Cortex: ${decision.improvements[0]?.title || "Auto-improvements"}`,
    head: ENGINE_BRANCH,
    base: BASE_BRANCH,
    body,
  });

  log(`PR opened: ${pr.html_url}`);
  return pr.html_url;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════");
  log("CORTEX ENGINE — Autonomous Cycle Start");
  log("═══════════════════════════════════════");

  try {
    const schema = await discoverSchema();
    const signals = await gatherSignals(schema);
    const roadmap = await readTaskRoadmap();
    const decision = await analyzeAndDecide(schema, signals, roadmap);
    await applyImprovements(decision);
    await updateDevlog(decision);
    const prUrl = await openPullRequest(decision);

    log("═══════════════════════════════════════");
    log("CORTEX ENGINE — Cycle Complete ✓");
    log(`PR: ${prUrl}`);
    log("═══════════════════════════════════════");
  } catch (err) {
    log(`ERROR: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();
