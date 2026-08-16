# Shadecode Cortex Research Lab

**Status:** Experimental protocol
**Date:** 2026-08-16

## Purpose

The Lab is the controlled environment for researching technical breakthroughs that could materially improve Shadecode Student or create reusable Shadecode technology.

Research must remain separate from production until evidence supports promotion.

## 1. Research tracks

### Edge AI

Investigate:

- quantization
- distillation
- pruning
- small specialist models
- local retrieval
- caching
- model routing
- speculative decoding where practical

Target outcomes:

- lower memory use
- lower latency
- useful offline behavior
- lower inference cost

### Learning intelligence

Investigate:

- knowledge graphs
- forgetting/decay estimation
- misconception detection
- adaptive hinting
- intervention selection
- assessment diagnostics

### Agent engineering

Investigate:

- bounded autonomous loops
- tool use
- planning
- verification
- self-evaluation
- rollback
- experiment selection

### Content intelligence

Investigate:

- curriculum mapping
- question classification
- assessment archetypes
- provenance-aware retrieval
- mark-scheme parsing

## 2. Experiment lifecycle

```text
Research question
      ↓
Hypothesis
      ↓
Baseline
      ↓
Smallest experiment
      ↓
Measure
      ↓
Reproduce
      ↓
Decision
```

## 3. Experiment naming

Use stable IDs such as:

`LAB-2026-001`, `LAB-2026-002`, etc.

Do not overwrite old results. Failed experiments are useful evidence.

## 4. Experiment template

```text
ID:
Title:
Research question:
Hypothesis:
Baseline:
Change:
Dataset/fixtures:
Hardware/environment:
Metrics:
Success threshold:
Results:
Limitations:
Decision: KEEP / ITERATE / REJECT
Promotion target:
Follow-up:
```

## 5. Promotion levels

### Experimental

Prototype only. No production dependency.

### Candidate

Repeatable result with acceptable regression profile.

### Production-approved

Explicitly reviewed, integrated, tested, monitored, and documented.

## 6. Research rules

- Do not benchmark only against a hand-picked example.
- Record negative results.
- Keep datasets/fixtures versioned where legally and technically appropriate.
- Do not upload private student data into experiments without an approved privacy boundary.
- Do not use copyrighted educational material outside its permitted use.
- Prefer reproducible measurements.
- Separate model quality from product quality.
- Never promote a research result because it is interesting alone; promote it because it solves a defined problem.

## 7. Success examples

A local model is interesting if it runs offline.

A local model is useful if it runs offline **and** meets a defined accuracy/latency threshold for a specific Shadecode task.

A compression technique is interesting if it reduces model size.

It becomes a candidate when the size reduction does not destroy the quality required by the target task.

## 8. First Lab priorities

1. Establish reproducible benchmark fixtures.
2. Measure current cloud/local behavior where local capability already exists.
3. Identify the highest-cost and highest-latency Cortex operations.
4. Test routing simple tasks away from expensive models.
5. Prototype one small local specialist task.
6. Record results before attempting broad local-model deployment.
