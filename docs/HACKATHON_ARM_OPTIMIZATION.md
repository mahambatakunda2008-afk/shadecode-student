# Arm AI Optimization Challenge Plan

## Objective

Use Shadecode Student's Cortex architecture as the basis for a measurable edge-AI optimization submission. The claim is not that the current local layer is already a full LLM. The claim is that Cortex is designed to minimize unnecessary heavyweight inference by combining memory-first retrieval, lightweight local handling, and escalation only when deeper reasoning is needed.

## Current baseline

Cortex already follows this dispatch shape:

`memory -> route -> local/teacher -> persist`

The router checks memory before invoking a provider, then uses a lightweight complexity heuristic to choose between `LocalModel` and `TeacherAI`. The local implementation is intentionally small and currently acts as a placeholder for real compact inference. This gives us a clean benchmark boundary for the optimization work.

## Optimization hypothesis

For constrained Arm devices, the system should reduce expensive inference by:

1. returning repeated answers from memory;
2. handling suitable requests locally;
3. escalating complex requests only when necessary;
4. reusing context and cached state instead of recomputing it;
5. eventually replacing the placeholder local engine with a quantized/specialized model.

The benchmark must prove whether these choices improve useful performance, rather than merely making the code smaller.

## Measurement protocol

Run the same workload before and after each optimization on the same device and software environment.

Record:

- median latency;
- p95 latency;
- requests/second;
- peak RSS memory;
- CPU utilization where available;
- model/package size;
- cache-hit rate;
- local-vs-remote routing rate;
- network calls avoided;
- output correctness on a fixed evaluation set.

Never report an optimization without its baseline and workload definition.

## Benchmark harness

Run:

```bash
npx tsx scripts/benchmark-cortex.ts
```

Optional:

```bash
BENCH_ITERATIONS=500 npx tsx scripts/benchmark-cortex.ts
```

The harness records Node version, architecture and platform and exercises representative simple, explanatory, comparative and analytical questions. The final submission should include measurements from the target Arm environment, not only a development PC.

## Optimization ladder

### A. Memory-first retrieval

Measure cache-hit latency against provider invocation latency. Expand normalization only if it improves hit rate without harming correctness.

### B. Routing calibration

Replace brittle keyword-only decisions with a deterministic feature scorer trained or calibrated against the fixed evaluation set. Keep the decision cheap enough to run locally.

### C. Compact local inference

Introduce a genuinely small local model for the subset of tasks selected by the router. Candidate techniques include quantization, distillation and task specialization.

### D. Hybrid execution

Keep complex reasoning on a stronger provider while allowing simple, high-frequency interactions to stay local. Measure the percentage of requests that avoid network inference.

### E. Offline resilience

Verify that selected workloads continue to function with network access disabled.

## Evidence required for submission

The final entry should contain:

- reproducible benchmark command;
- fixed test workload;
- Arm hardware/software details;
- baseline measurements;
- optimized measurements;
- methodology and limitations;
- architecture diagram;
- short demo showing the optimization in action.

## Guardrails

- Do not claim local LLM inference while `LocalModel` remains a placeholder.
- Do not fabricate Arm measurements from x86 hardware.
- Do not optimize away correctness.
- Keep production learning behaviour stable while experiments are isolated.
- Treat benchmark results as evidence, not marketing copy.

## Immediate implementation sequence

1. Establish baseline measurements with `scripts/benchmark-cortex.ts`.
2. Add cache-hit instrumentation and a fixed evaluation set.
3. Implement the first compact local inference candidate.
4. Re-run the benchmark on Arm.
5. Compare latency, memory, throughput and network avoidance.
6. Package only verified improvements into the hackathon submission.
