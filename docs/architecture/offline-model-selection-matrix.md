# Offline model selection matrix

## Candidates

| Candidate | Params | Primary role | Initial target |
|---|---:|---|---|
| Qwen2.5-0.5B-Instruct | ~494M | strong small instruct baseline | compact |
| SmolLM2-360M-Instruct | ~362M | smaller browser-friendly baseline | micro |

These are benchmark candidates, not final production selections.

## Required experiment

For each candidate, test the upstream model and compressed variants:

1. baseline;
2. INT8;
3. INT4;
4. structured-pruned + INT4;
5. distilled + structured-pruned + INT4.

Run the same Shadecode benchmark across all variants. Record size, peak memory, cold start, generation speed, task quality and integrity pass rate.

## Selection rule

Do not choose solely on benchmark leaderboard scores or parameter count. Prefer the smallest artifact that passes Shadecode quality and integrity gates with acceptable latency on the target device class.

A variant that fails project-integrity or mathematical correctness gates is rejected even if it is substantially smaller.

## Current status

Candidate discovery is complete. Actual training/compression requires a compute environment and approved training data. No benchmark score is claimed until the experiment produces measurements.
