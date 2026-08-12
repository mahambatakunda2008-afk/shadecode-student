import { performance } from "node:perf_hooks";
import { CompactLocalModel } from "../src/lib/cortex/compactLocalModel";
import { LocalModel } from "../src/lib/cortex/localModel";
import { CortexRouter } from "../src/lib/cortex/router";
import type { CortexSnapshot } from "../src/lib/cortex/types";

type Sample = { label: string; question: string };

const samples: Sample[] = [
  { label: "definition", question: "What is acceleration?" },
  { label: "fact", question: "Define photosynthesis." },
  { label: "explanation", question: "Explain why increasing resistance changes current in a circuit." },
  { label: "comparison", question: "Compare scalar and vector quantities and give examples." },
  { label: "analysis", question: "Analyze the relationship between force, mass and acceleration and explain the consequences of changing each variable." },
];

function createBenchmarkSnapshot(): CortexSnapshot {
  return {
    streak: 0,
    level: 1,
    xp: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    subjects: [],
    recentTaskTitles: [],
  };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

async function benchmarkLocalModel(iterations = 100) {
  const model = new LocalModel();
  const snapshot = createBenchmarkSnapshot();
  const rows: Array<{ label: string; avgMs: number; p95Ms: number }> = [];

  for (const sample of samples) {
    const times: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      await model.generate(sample.question, { history: [], snapshot });
      times.push(performance.now() - start);
    }
    rows.push({
      label: sample.label,
      avgMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: percentile(times, 0.95),
    });
  }
  return rows;
}

function benchmarkCompactLocalModel(iterations = 100) {
  const model = new CompactLocalModel();
  const snapshot = createBenchmarkSnapshot();
  const rows: Array<{ label: string; avgMs: number; p95Ms: number; intent: string }> = [];

  for (const sample of samples) {
    const times: number[] = [];
    let intent = "generic";
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      const result = model.infer(sample.question, { history: [], snapshot });
      intent = result.intent;
      times.push(performance.now() - start);
    }
    rows.push({
      label: sample.label,
      avgMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: percentile(times, 0.95),
      intent,
    });
  }
  return rows;
}

async function benchmarkRouter(iterations = 100) {
  const existingRouter = new CortexRouter();
  const compactRouter = new CortexRouter({ useCompactLocalModel: true });
  const results: Array<{ label: string; existingAvgMs: number; compactAvgMs: number; existingSource: string; compactSource: string }> = [];

  for (const sample of samples) {
    const existingTimes: number[] = [];
    const compactTimes: number[] = [];
    let existingSource = "unknown";
    let compactSource = "unknown";

    for (let i = 0; i < Math.min(iterations, 20); i += 1) {
      const existingStart = performance.now();
      try {
        const response = await existingRouter.handle({ userId: `bench-existing-${sample.label}-${i}`, question: sample.question });
        existingSource = response.source;
      } catch (error) {
        existingSource = `error:${error instanceof Error ? error.name : "unknown"}`;
      }
      existingTimes.push(performance.now() - existingStart);

      const compactStart = performance.now();
      try {
        const response = await compactRouter.handle({ userId: `bench-compact-${sample.label}-${i}`, question: sample.question });
        compactSource = response.source;
      } catch (error) {
        compactSource = `error:${error instanceof Error ? error.name : "unknown"}`;
      }
      compactTimes.push(performance.now() - compactStart);
    }

    results.push({
      label: sample.label,
      existingAvgMs: existingTimes.reduce((a, b) => a + b, 0) / existingTimes.length,
      compactAvgMs: compactTimes.reduce((a, b) => a + b, 0) / compactTimes.length,
      existingSource,
      compactSource,
    });
  }
  return results;
}

async function main() {
  const iterations = Number(process.env.BENCH_ITERATIONS ?? 100);
  console.log(`Cortex edge benchmark | iterations=${iterations}`);
  console.log(`Node=${process.version} | arch=${process.arch} | platform=${process.platform}`);
  console.log("\nExisting LocalModel");
  console.table(await benchmarkLocalModel(iterations));
  console.log("\nCompactLocalModel candidate");
  console.table(benchmarkCompactLocalModel(iterations));
  console.log("\nRouter: production-default vs explicit compact experiment");
  console.table(await benchmarkRouter(iterations));
  console.log("\nRecord the same command on the target Arm device and compare latency, throughput, RSS, package/model size, correctness, and network avoidance.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
