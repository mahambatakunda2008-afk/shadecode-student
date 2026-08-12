import { performance } from "node:perf_hooks";
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

async function benchmarkRouter(iterations = 100) {
  const router = new CortexRouter();
  const results: Array<{ label: string; avgMs: number; source: string }> = [];

  for (const sample of samples) {
    const times: number[] = [];
    let source = "unknown";
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      try {
        const response = await router.handle({ userId: `bench-${sample.label}`, question: sample.question });
        source = response.source;
      } catch (error) {
        // Network/provider configuration is deliberately not required for this harness.
        source = `error:${error instanceof Error ? error.name : "unknown"}`;
      }
      times.push(performance.now() - start);
    }
    results.push({
      label: sample.label,
      avgMs: times.reduce((a, b) => a + b, 0) / times.length,
      source,
    });
  }
  return results;
}

async function main() {
  const iterations = Number(process.env.BENCH_ITERATIONS ?? 100);
  console.log(`Cortex edge benchmark | iterations=${iterations}`);
  console.log(`Node=${process.version} | arch=${process.arch} | platform=${process.platform}`);
  console.log("\nLocalModel");
  console.table(await benchmarkLocalModel(iterations));
  console.log("\nCortexRouter");
  console.table(await benchmarkRouter(Math.min(iterations, 20)));
  console.log("\nRecord the same command on the target Arm device and compare median/p95 latency, throughput, RSS, and package/model size.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
