import { performance } from "node:perf_hooks";
import { compactInfer } from "../src/lib/cortex/compactInference";

const samples = [
  "What is acceleration?",
  "Define photosynthesis.",
  "Explain why increasing resistance changes current in a circuit.",
  "Compare scalar and vector quantities and give examples.",
  "Calculate the acceleration when velocity changes from 10 m/s to 30 m/s in 5 seconds.",
];

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function main() {
  const iterations = Number(process.env.BENCH_ITERATIONS ?? 1000);
  const timings: number[] = [];
  let tokens = 0;

  for (let i = 0; i < iterations; i += 1) {
    for (const question of samples) {
      const start = performance.now();
      const result = compactInfer(question);
      timings.push(performance.now() - start);
      tokens += result.tokensProcessed;
    }
  }

  const total = timings.reduce((a, b) => a + b, 0);
  const avg = total / timings.length;
  console.log(`Compact Cortex benchmark | iterations=${iterations}`);
  console.log(`Node=${process.version} | arch=${process.arch} | platform=${process.platform}`);
  console.table({
    samples: timings.length,
    avgMs: avg,
    p50Ms: percentile(timings, 0.5),
    p95Ms: percentile(timings, 0.95),
    p99Ms: percentile(timings, 0.99),
    throughputPerSecond: 1000 / avg,
    avgTokensProcessed: tokens / timings.length,
  });
}

main();
