/**
 * CORTEX ENGINE
 * Autonomous self-improvement agent for Shadecode Student
 * Powered by Gemini 2.5 | Runs on GitHub Actions
 * Repo: mahambatakunda2008-afk/shadecode-student
 */

const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Octokit } = require("@octokit/rest");

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
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
  const candidates = [
    "users", "insights", "tasks", "xp", "streaks",
    "subjects", "sessions", "activity", "notifications", "badges",
    "achievements", "cortex_insights", "daily_challenges", "exams",
    "profiles", "study_topics", "timetable"
  ];
  for (const table of candidates) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(3);
      if (!error && data !== null) {
        tables[table] = {
          exists: true,
          sampleCount: data.length,
          // If table is empty, mark it as existing but empty — NOT broken
          columns: data.length > 0 ? Object.keys(data[0]) : ["TABLE_EXISTS_BUT_EMPTY"],
          sample: data.slice(0, 2),
        };
        log(`  ✓ Found table: ${table} (${data.length} sample rows)`);
      }
    } catch { }
  }
  log(`Schema discovery complete. Found: ${Object.keys(tables).join(", ")}`);
  return tables;
}

// ── Step 2: Gather behavioral signals ────────────────────────────────────────
async function gatherSignals(schema) {
  log("Gathering behavioral signals from Supabase...");
  const signals = {};
  if (schema.insights) {
    const { data } = await supabase.from("insights").select("*").order("created_at", { ascending: false }).limit(50);
    signals.recentInsights = data || [];
    log(`  Insights loaded: ${signals.recentInsights.length}`);
  }
  if (schema.profiles) {
    const { data } = await supabase.from("profiles").select("*").limit(20);
    signals.userStats = data || [];
    log(`  Profiles loaded: ${signals.userStats.length}`);
  }
  for (const [table, meta] of Object.entries(schema)) {
    if (!["insights", "profiles"].includes(table) && meta.exists) {
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
    const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: ".cortex/tasks.md", ref: BASE_BRANCH });
    const content = Buffer.from(data.content, "base64").toString("utf8");
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

// ── Step 3: Ask AI what to improve ───────────────────────────────────────────
async function analyzeAndDecide(schema, signals, roadmap) {
  log("Consulting AI for improvement decisions...");

  const schemaDesc = Object.entries(schema).map(([t, m]) => {
    const colDesc = m.columns.includes("TABLE_EXISTS_BUT_EMPTY")
      ? "EXISTS (empty — no rows yet, schema is fine)"
      : `columns=[${m.columns.join(", ")}]`;
    return `${t}: ${colDesc}`;
  }).join("\n");

  const insightSample = signals.recentInsights?.slice(0, 5) || [];
  const nextTasks = roadmap.pendingTasks.slice(0, 3).map((t, i) => `${i + 1}. ${t.title}\n${t.details.join("\n")}`).join("\n\n");

  const prompt = `
You are Cortex Engine, the autonomous self-improvement agent for Shadecode Student.
Shadecode Student is a Next.js + Supabase learning platform where Cortex (powered by Gemini)
observes student study behavior and reflects patterns back to them as neutral insights.

CURRENT DATABASE SCHEMA:
${schemaDesc}

IMPORTANT SCHEMA NOTES:
- Tables marked "EXISTS (empty)" are working correctly — they just have no data yet. Do NOT recreate them.
- All core tables already exist: achievements, cortex_insights, daily_challenges, exams, insights, profiles, study_topics, subjects, tasks, timetable
- NEVER create SQL migrations or try to fix table schemas — the database is correctly set up.
- Focus ONLY on building frontend React/Next.js components and API routes.

RECENT INSIGHTS SAMPLE:
${JSON.stringify(insightSample, null, 2)}

CURRENT TASK ROADMAP (work on these in order):
${nextTasks || "No tasks defined — use your judgment"}

BEHAVIORAL SIGNALS SUMMARY:
- Total users: ${signals.userStats?.length || "unknown"}
- Recent insights generated: ${signals.recentInsights?.length || 0}
- Other active tables: ${Object.keys(signals).filter(k => !["recentInsights", "userStats"].includes(k)).join(", ")}

YOUR TASK:
Pick the FIRST pending task from the roadmap and build it. Do not work on database schema.
Produce a JSON response with this exact structure:

{
  "analysis": "2-3 sentence neutral analysis of what needs to be built next",
  "improvements": [
    {
      "type": "new_feature | new_component | bug_fix | refactor",
      "title": "Short title",
      "description": "What to build and why",
      "priority": "high | medium | low",
      "file_path": "relative path in repo e.g. src/components/DailyChallenge.jsx",
      "code": "complete file content to write"
    }
  ],
  "devlog_entry": "A short developer log entry describing what Cortex did this cycle"
}

Rules:
- Max 3 improvements per cycle
- NEVER create SQL files, migrations, or database schema — only React/Next.js code
- NEVER recreate tables that already exist
- Code must use ES modules (import/export syntax)
- All app code goes under src/ — never at root level
- Never import @google/generative-ai, @octokit/rest, fs, or path in app code
- Use @supabase/supabase-js directly in API routes
- All exports must be named exports
- devlog_entry written in first person as Cortex
`;

  let rawText = null;

  // Try Gemini models. gemini-2.0-flash and gemini-2.0-flash-lite are
  // confirmed permanently zero-quota on this account (see src/lib/ai.ts
  // and docs/AUDIT_2026-08.md) -- trying them wastes time before reaching
  // OpenRouter, they are not a real fallback. 2.5-flash only, but with a
  // short retry: "503 Service Unavailable / high demand" is a transient
  // Google-side condition, not a real failure, and gives up too easily
  // on the first attempt otherwise.
  const geminiModels = ["gemini-2.5-flash"];
  const GEMINI_RETRY_ATTEMPTS = 2;
  const GEMINI_RETRY_DELAY_MS = 5000;
  for (const modelName of geminiModels) {
    for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
      try {
        log(`Trying model: ${modelName} (attempt ${attempt}/${GEMINI_RETRY_ATTEMPTS})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        rawText = result.response.text();
        log(`Success with model: ${modelName}`);
        break;
      } catch (err) {
        const isTransient = /503|overloaded|high demand|unavailable/i.test(err.message);
        log(`Model ${modelName} failed (attempt ${attempt}): ${err.message}`);
        if (isTransient && attempt < GEMINI_RETRY_ATTEMPTS) {
          log(`Transient error, retrying in ${GEMINI_RETRY_DELAY_MS / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
        }
      }
    }
    if (rawText) break;
  }

  // Fallback to OpenRouter
  if (!rawText && OPENROUTER_API_KEY) {
    try {
      log("Trying OpenRouter fallback...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      rawText = data.choices?.[0]?.message?.content;
      if (rawText) {
        log("Success with OpenRouter");
      } else {
        // fetch() succeeded but the response didn't have the expected
        // shape -- previously this silently fell through to "All AI
        // models failed" with zero indication why. Log the actual
        // response so a failure here is diagnosable without needing
        // another log round-trip.
        log(`OpenRouter returned no usable content. HTTP ${response.status}. Response: ${JSON.stringify(data).slice(0, 500)}`);
      }
    } catch (err) {
      log(`OpenRouter failed: ${err.message}`);
    }
  }

  if (!rawText) throw new Error("All AI models failed.");

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  const decision = JSON.parse(jsonMatch[0]);
  log(`Analysis: ${decision.analysis}`);
  log(`Improvements planned: ${decision.improvements.length}`);
  decision.improvements.forEach(i => log(`  → [${i.priority}] ${i.title}`));

  return decision;
}

// ── Step 4: Apply improvements to GitHub ─────────────────────────────────────
async function applyImprovements(decision) {
  log("Applying improvements to GitHub...");
  const { data: ref } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${BASE_BRANCH}` });
  const baseSha = ref.object.sha;
  await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${ENGINE_BRANCH}`, sha: baseSha });
  log(`Created branch: ${ENGINE_BRANCH}`);

  for (const improvement of decision.improvements) {
    if (!improvement.code || !improvement.file_path) continue;
    // Skip any SQL files
    if (improvement.file_path.endsWith(".sql")) {
      log(`  Skipping SQL file: ${improvement.file_path}`);
      continue;
    }
    const content = Buffer.from(improvement.code).toString("base64");
    let fileSha;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: improvement.file_path, ref: ENGINE_BRANCH });
      fileSha = existing.sha;
    } catch { fileSha = undefined; }
    await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: improvement.file_path, message: `cortex: ${improvement.title}`, content, sha: fileSha, branch: ENGINE_BRANCH });
    log(`  Committed: ${improvement.file_path}`);
  }
  return baseSha;
}

// ── Step 5: Update DEVLOG.md ──────────────────────────────────────────────────
async function updateDevlog(decision) {
  log("Updating DEVLOG.md...");
  const date = new Date().toISOString().split("T")[0];
  const entry = `\n## ${date} — Cortex Auto-Cycle\n\n${decision.devlog_entry}\n\n**Improvements this cycle:**\n${decision.improvements.map(i => `- [${i.priority.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")}\n\n---\n`;
  let existingContent = `# Shadecode Student — Cortex Devlog\n\nAutonomous improvement log maintained by Cortex Engine.\n\n---\n`;
  let fileSha;
  try {
    const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: "DEVLOG.md", ref: ENGINE_BRANCH });
    existingContent = Buffer.from(data.content, "base64").toString("utf8");
    fileSha = data.sha;
  } catch { fileSha = undefined; }
  await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: "DEVLOG.md", message: "cortex: update devlog", content: Buffer.from(existingContent + entry).toString("base64"), sha: fileSha, branch: ENGINE_BRANCH });
  log("DEVLOG.md updated.");
}

// ── Step 6: Open Pull Request ─────────────────────────────────────────────────
async function openPullRequest(decision) {
  log("Opening Pull Request...");
  const body = `## 🧠 Cortex Auto-Improvement\n\n**Analysis:**\n${decision.analysis}\n\n**Changes in this PR:**\n${decision.improvements.map(i => `- **[${i.priority.toUpperCase()}]** \`${i.file_path}\` — ${i.title}: ${i.description}`).join("\n")}\n\n**Devlog:**\n${decision.devlog_entry}\n\n---\n*This PR was generated autonomously by Cortex Engine. Review before merging.*`;
  const { data: pr } = await octokit.pulls.create({ owner: REPO_OWNER, repo: REPO_NAME, title: `🧠 Cortex: ${decision.improvements[0]?.title || "Auto-improvements"}`, head: ENGINE_BRANCH, base: BASE_BRANCH, body });
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

    // Persist the failure where a human can actually see it -- GitHub's
    // Actions log storage isn't reliably fetchable via API/tooling, but
    // the step summary renders directly in the Actions UI and survives
    // independently of log retention.
    try {
      const fs = require("fs");
      if (process.env.GITHUB_STEP_SUMMARY) {
        const recentLogs = logs.slice(-15).join("\n");
        fs.appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `## ❌ Cortex Engine cycle failed\n\n**Error:** ${err.message}\n\n**Stack:**\n\`\`\`\n${err.stack || "(no stack)"}\n\`\`\`\n\n**Last log lines:**\n\`\`\`\n${recentLogs}\n\`\`\`\n`
        );
      }
    } catch (summaryErr) {
      console.error("Failed to write step summary:", summaryErr.message);
    }

    process.exit(1);
  }
}

main();
