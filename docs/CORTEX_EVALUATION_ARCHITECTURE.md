# Cortex Evaluation Architecture

**Status:** Strategic implementation specification
**Date:** 2026-08-16

## Objective

Cortex must evolve from an autonomous code proposer into an evidence-driven improvement system.

The central rule is:

> Cortex earns more autonomy through measured evidence.

## 1. Improvement loop

```text
Observe
  ↓
Diagnose
  ↓
Hypothesis
  ↓
Plan
  ↓
Sandbox
  ↓
Implement
  ↓
Test
  ↓
Benchmark
  ↓
Measure
  ↓
Decision
 ├── reject
 ├── iterate
 └── open PR
```

## 2. Four evaluation layers

### Layer A — Static correctness

Required before any product-impact evaluation:

- TypeScript compilation
- lint
- unit tests
- integration tests where applicable
- route/build checks
- dependency checks

A change that cannot pass basic correctness is rejected.

### Layer B — Behavioral regression

Verify that the change does not break existing contracts:

- authentication boundaries
- data isolation
- API contracts
- navigation
- offline behavior
- existing learning flows
- assessment integrity

### Layer C — Product behavior

Measure whether the intended behavior actually changed.

Examples:

- recommendation relevance
- hint usefulness
- lesson completion
- question accuracy
- sync success
- latency
- AI failure rate

### Layer D — Learning outcome

Where the feature claims to improve learning, require an outcome metric rather than relying only on engagement.

Examples:

- later recall
- subsequent independent correctness
- reduced repeated errors
- assessment performance
- time-to-mastery

## 3. Experiment record

Every non-trivial Cortex experiment should record:

```text
experiment_id
hypothesis
problem
baseline
change
population_or_fixture
metrics
minimum_success_threshold
regression_checks
result
confidence
recommendation
owner
created_at
```

## 4. Baselines

Every experiment must define a baseline before claiming improvement.

A baseline can be:

- current production behavior
- deterministic reference implementation
- previous model/version
- fixed benchmark fixture

Do not compare against a moving target without recording the version.

## 5. Guardrails

Cortex must not autonomously merge changes solely because a language model says the code is good.

Required safeguards:

- isolated branch
- automated verification
- bounded file scope
- no uncontrolled secret access
- no direct production schema changes from generated code
- human review for production-impacting changes
- rollback path

## 6. Student simulation

Before a mature autonomous product experiment, build deterministic fixtures representing common learner states.

Examples:

- novice with prerequisite gap
- strong student making careless errors
- student with high confidence but weak evidence
- student with stale mastery
- intermittent-connectivity student
- tertiary student using modules/semesters

Simulation is a complement to real student evidence, not a replacement for it.

## 7. Metrics hierarchy

Prioritize metrics in this order:

1. Learning outcome
2. Correctness/reliability
3. Retention and continued useful use
4. Latency/accessibility
5. Cost
6. Feature engagement
7. Aesthetic preference

A feature should not be called successful because clicks increased if learning or reliability became worse.

## 8. Decision policy

```text
Clear improvement + no critical regression → promote

Promising but uncertain → iterate / collect more evidence

No meaningful improvement → reject or redesign

Regression in security, integrity, correctness, or data safety → reject immediately
```

## 9. Cortex Engineering versus Student Cortex

These are separate concerns.

### Cortex Engineering

Responsible for repository observation, implementation experiments, testing, PRs and engineering decisions.

### Student Cortex

Responsible for learner memory, tutoring, assessment, planning and personalization.

They may share infrastructure, but they must not be conflated into one autonomous authority.

## 10. First implementation milestone

The first engineering implementation should be a small evaluation harness around pure functions and existing Cortex behavior, not a new database system.

Initial target:

```text
fixture → existing behavior → expected outcome → score → report
```

Only after the harness is trustworthy should Cortex be given authority to use experimental results in development decisions.
