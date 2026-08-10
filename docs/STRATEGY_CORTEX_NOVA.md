# Shadecode Student: Cortex Nova Strategy

**Status:** Strategic direction / research plan
**Date:** 2026-08-10
**Scope:** Shadecode Student architecture, intelligence, offline capability, model strategy, experimentation, and pivot resilience

---

## 1. Strategic Shift

Shadecode Student should not be treated primarily as a web app with an AI feature. The strategic direction is to build a **student intelligence system** that happens to have web, mobile, and desktop interfaces.

The product should evolve toward a **Personal Learning OS**:

> A small, adaptive intelligence that understands how a student learns, works with or without the internet, continuously adapts, and turns limited computing/data into better learning.

This direction builds on the existing Shadecode Student vision of an academic operating system and Cortex learning intelligence, while moving the center of gravity from individual UI features toward reusable intelligence infrastructure.

---

## 2. The Core Thesis

The strongest differentiation should come from the system underneath the interface, not from adding another generic chatbot.

Shadecode should aim to combine:

- deterministic learning intelligence
- a persistent student model
- a curriculum/knowledge graph
- local/offline intelligence
- cloud escalation when necessary
- adaptive model routing
- personalized learning interventions
- experimentation and measurement
- provider and model independence

The goal is not simply to make a large language model smaller. The goal is to ask:

> **How little computation is required to provide the educational capability we actually need?**

This should guide model selection, compression, inference, and architecture decisions.

---

## 3. Cortex Nova Architecture

The proposed architecture has seven major intelligence layers:

```text
                 SHADECODE STUDENT
                        |
                +-------v-------+
                |   EXPERIENCE  |
                | Web / Mobile  |
                | Desktop / PWA |
                +-------+-------+
                        |
                +-------v-------+
                | CORTEX AGENT  |
                | Planning      |
                | Tutoring      |
                | Reasoning     |
                | Adaptation    |
                +-------+-------+
                        |
        +---------------+----------------+
        |               |                |
   +----v----+     +----v----+      +----v-----+
   | Memory  |     | Student |      | Learning |
   | System  |     | Model   |      | Engine   |
   +----+----+     +----+----+      +----+-----+
        |               |                |
        +---------------+----------------+
                        |
                +-------v-------+
                | MODEL ROUTER  |
                | Local / Cloud |
                | Fast / Strong |
                +-------+-------+
                        |
              +---------+----------+
              |                    |
       +------v------+      +------v------+
       | LOCAL MODELS|      | CLOUD MODELS|
       | compressed  |      | Gemini etc. |
       +-------------+      +-------------+
```

### Important architectural distinction

**Reasoning engine != language model.**

Cortex should not require an LLM for every decision. Mastery calculations, scheduling, spaced repetition, event processing, progress tracking, difficulty scoring, and many forms of pattern detection should be deterministic or algorithmic.

LLMs should be used where language generation or difficult reasoning actually provides value.

---

## 4. The Intelligence Layers

### 4.1 Student Model

Cortex should maintain a structured representation of the learner's current learning state.

Potential dimensions include:

- subject/topic mastery
- strengths and weaknesses
- misconception clusters
- learning pace
- session behavior
- preferred study patterns
- task completion patterns
- current goals
- exam readiness
- intervention history

Example conceptual representation:

```text
Student Model
-------------
Mathematics
  Algebra       0.81
  Trigonometry  0.67
  Mechanics     0.43

Learning behaviour
  Best time: 19:00
  Average session: 31m
  Abandonment: high after 45m

Knowledge behaviour
  Strong recall
  Weak transfer
  Frequent calculation errors

Current risks
  Mechanics
  Exam preparation
```

This is a learning state, not a surveillance profile. Collection should be purposeful, privacy-conscious, and explainable.

---

### 4.2 Learning Graph

Subjects should eventually be represented as connected concepts rather than flat folders.

```text
             Vectors
                |
                v
          Kinematics
                |
          +-----+-----+
          v           v
       Forces       Momentum
          |
          v
       Moments
```

This allows Cortex to reason about prerequisite failures. A student who struggles with moments may actually have a vector decomposition problem upstream.

The Learning Graph should eventually connect:

- curriculum concepts
- prerequisites
- questions
- lessons
- misconceptions
- student mastery
- exam topics

---

### 4.3 Memory System

Memory should be separated into different forms:

**Local state**
- current progress
- recent sessions
- cached learning content
- pending sync operations

**Cloud state**
- durable account data
- cross-device synchronization
- analytics

**Semantic memory**
- embeddings / semantic retrieval where useful

**Structured memory**
- student model
- mastery state
- learning graph

**Event stream**

Examples:

```text
student_opened_lesson
student_answered_question
student_failed_question
student_completed_task
student_requested_hint
student_abandoned_session
```

Cortex should derive learning intelligence from these events rather than repeatedly dumping raw database rows into a language-model prompt.

---

## 5. Offline-First Intelligence

Offline should become an architectural capability rather than simply a cached UI state.

The offline experience should eventually support:

- lessons
- notes
- flashcards
- question banks
- student model
- mastery calculations
- scheduling
- basic Cortex tutoring
- progress tracking
- XP
- achievements
- local search
- selected local model inference

Synchronization should happen when connectivity returns.

```text
               INTERNET
                  |
        +---------v---------+
        | Cloud Cortex      |
        | heavy reasoning   |
        | model updates     |
        | synchronization   |
        +---------+---------+
                  |
             synchronization
                  |
        +---------v---------+
        | Local Cortex      |
        | student state     |
        | local models      |
        | learning graph    |
        | knowledge cache   |
        +-------------------+
```

The application should degrade gracefully rather than becoming unusable when the network disappears.

---

## 6. Local Model Strategy

Local models should be introduced as first-class components, but model selection must be evidence-driven.

Do **not** simply download a large generic model and force it into the client.

Investigate a model ladder:

### Tier 0: Deterministic Intelligence

No model required.

Potential capabilities:

- spaced repetition
- mastery calculations
- curriculum graph traversal
- misconception scoring
- study scheduling
- streak logic
- XP logic
- pattern detection

### Tier 1: Tiny Local Models

Potential uses:

- intent detection
- topic classification
- short explanations
- hint generation
- concept extraction
- misconception classification

### Tier 2: Compressed Local Reasoning Model

Potential uses:

- tutoring
- multi-step explanations
- question generation
- contextual reasoning

### Tier 3: Cloud Intelligence

Potential uses:

- difficult reasoning
- large-context tasks
- multimodal analysis
- difficult mathematics
- complex lesson generation

The user should not need to know which tier handled a request.

---

## 7. Compression and Model Efficiency Research

Compression is a means, not the product strategy.

Research tracks should include:

### Quantization

Evaluate reduced-precision model variants, including INT8 and INT4 where quality and runtime permit.

### Knowledge Distillation

Train or adapt smaller models using stronger teacher models for narrowly defined Shadecode tasks.

### Task-Specific Specialization

Investigate whether a smaller model specialized for tutoring, misconceptions, question generation, and exam preparation can outperform a larger generic model on Shadecode's actual workloads.

### Adapters

Where technically appropriate, investigate small task/subject-specific adapters instead of duplicating complete models.

### Structured Generation

Prefer compact structured outputs when the system needs decisions rather than prose.

Example:

```json
{
  "concept": "Newton's Second Law",
  "mastery": 0.42,
  "misconception": "...",
  "next_action": "practice",
  "difficulty": 3
}
```

Deterministic application code can then execute the action instead of asking an LLM to generate the entire workflow.

### Caching

Cache stable or reusable outputs where appropriate. Avoid repeatedly generating the same educational material.

### Retrieval

Prefer retrieving known curriculum/question content over asking a model to regenerate information that already exists.

### Goal

Optimize for **educational capability per megabyte, joule, second, and dollar**, not parameter count alone.

---

## 8. Adaptive Model Router

The current Cortex developer engine uses a provider fallback chain. The future student-facing intelligence layer should evolve toward a more capable model router.

Conceptual flow:

```text
                    Request
                       |
                       v
                +-------------+
                | MODEL ROUTER|
                +------+------+
                       |
       +---------------+----------------+
       v               v                v
 deterministic      local            cloud
       |               |                |
   instant/$0       offline          powerful
```

Routing signals can include:

- task complexity
- confidence
- latency requirements
- connectivity
- battery state
- device RAM/GPU capability
- available model
- context length
- cost
- privacy requirements

### Adaptive escalation

A simple request should stay local.

A difficult request can escalate.

A low-confidence local answer can be verified by a stronger model.

The cloud should become an **escalation mechanism**, not necessarily the default.

---

## 9. Adaptive Inference

Cortex should eventually estimate request complexity and confidence.

Example:

```text
confidence = 0.98
complexity = low
=> tiny local model
```

Versus:

```text
confidence = 0.51
complexity = high
=> stronger local model or cloud escalation
```

The system should measure whether escalation actually improves outcomes rather than assuming that bigger models are always better.

---

## 10. Cortex Student vs Cortex Dev

The current autonomous Cortex engine is primarily a developer automation system. It discovers database signals, reads a task roadmap, asks an external model for an implementation, writes files, updates the devlog, and opens a PR.

That system should remain useful, but it should not be confused with the student-facing Cortex.

Eventually separate the roles:

```text
Cortex Student
       |
       +-- perception
       +-- memory
       +-- reasoning
       +-- planning
       +-- tutoring
       +-- adaptation

Cortex Dev
       |
       +-- repository analysis
       +-- testing
       +-- improvement proposals
       +-- code generation
       +-- PR creation
```

They can share principles and infrastructure without being the same runtime.

---

## 11. Experimentation Engine

Product and learning decisions should be tested rather than debated indefinitely.

Potential experiment structure:

```text
Experiment #27

Hypothesis:
Shorter daily challenges increase completion.

Control:
10-minute challenge

Variant:
3-minute challenge

Measure:
completion rate
7-day retention
XP earned
session frequency
```

The experimentation system should eventually support:

- learning interventions
- UI changes
- study schedules
- challenge formats
- model selection
- model routing
- retention experiments
- performance regressions

Long term, Cortex can become a system that learns about how students learn.

---

## 12. Feature Architecture

The current feature roadmap remains valuable, but the strategic order should change.

Features such as:

- Daily Challenge
- achievements
- leaderboard
- goals
- streaks
- subject progress
- dashboard
- onboarding

should increasingly become **applications on top of Cortex infrastructure**, rather than isolated intelligence silos.

The principle is:

```text
Intelligence infrastructure
          |
          +-- Daily Challenge
          +-- Adaptive Revision
          +-- Exam Simulation
          +-- Past Papers
          +-- AI Lessons
          +-- Dashboard
          +-- Goals
          +-- Achievements
          +-- Teacher tools
```

Do not delete the existing feature roadmap merely because the architecture is changing. Reframe and reprioritize it around the intelligence core.

---

## 13. Pivot-Resilient Architecture

Shadecode should explicitly avoid making one technical or product hypothesis a single point of failure.

### Pivot A: Local LLMs are too slow

Fallback to deterministic learning intelligence, retrieval, classifiers, and smaller specialized models.

### Pivot B: Browser inference is too heavy

Move inference to native mobile/desktop runtimes while retaining the same intelligence interfaces.

### Pivot C: Native packaging becomes too costly

Use the PWA/installable desktop path while preserving the same local/cloud abstraction.

### Pivot D: Local model quality is insufficient

Use cloud escalation for difficult tasks.

### Pivot E: AI inference costs become too high

Increase local inference, caching, retrieval, specialization, and deterministic computation.

### Pivot F: Students do not care about AI as a feature

Position the product around adaptive learning, exam preparation, offline capability, and outcomes rather than AI branding.

### Pivot G: Student product traction is insufficient

Reuse Cortex, learning graph, adaptive learning, and offline infrastructure for teachers, schools, or institutional learning products.

### Architectural rule

> **The architecture must survive even if the product hypothesis changes.**

---

## 14. Capability Matrix

The following is a planning framework, not a final implementation commitment.

| Capability | Offline | Tiny Model | Strong Local | Cloud | Deterministic |
|---|---:|---:|---:|---:|---:|
| Flashcards | Yes | No | No | No | Yes |
| Mastery | Yes | No | No | No | Yes |
| Scheduling | Yes | No | No | No | Yes |
| Topic classification | Yes | Yes | Optional | Optional | No |
| Hint generation | Yes | Yes | Optional | Optional | No |
| Lesson generation | Partial | Optional | Yes | Yes | No |
| Difficult reasoning | No | No | Yes | Yes | No |
| Image math | Partial | No | Optional | Yes | No |
| Student modelling | Yes | Optional | No | Optional | Yes |
| Personalization | Yes | Optional | Optional | Optional | Yes |

This matrix must be validated through benchmarks before implementation decisions are finalized.

---

## 15. Research Before Commitment

The following areas should be researched against current tooling, benchmarks, device constraints, licensing, and implementation effort before choosing a production model/runtime:

1. Browser local inference runtimes
2. Android local inference runtimes
3. Desktop inference runtimes
4. WebGPU/WebAssembly capabilities
5. Current small language models suitable for educational tasks
6. Quantization methods and quality loss
7. Knowledge distillation approaches
8. LoRA/adapters and task specialization
9. Model licensing and redistribution requirements
10. On-device storage requirements
11. Model startup latency
12. RAM/VRAM requirements
13. Battery/thermal impact
14. Offline synchronization architecture
15. Current embedding/vector options
16. Evaluation frameworks for tutoring quality
17. Hallucination and educational safety evaluation
18. Cost comparison between local and cloud inference

No model should be selected solely because it is currently popular.

---

## 16. Proposed Program: CORTEX-NOVA

Internal codename for the next architectural phase.

### Track 1: Intelligence Core

- Student Model
- Learning Graph
- Memory
- event system
- reasoning layer

### Track 2: Local Intelligence

- runtime research
- tiny model benchmark
- quantization benchmark
- distillation experiments
- model packaging
- device capability detection

### Track 3: Model Router

- deterministic routing
- local routing
- cloud routing
- escalation
- confidence scoring

### Track 4: Offline OS

- local database
- offline content
- local Cortex
- synchronization
- conflict resolution

### Track 5: Adaptive Learning

- mastery engine
- misconception detection
- question difficulty
- spaced repetition
- intervention engine

### Track 6: Experimentation

- A/B infrastructure
- learning experiments
- retention experiments
- model evaluations
- automatic regression detection

### Track 7: Product Surfaces

- Student
- Teacher
- School
- Desktop
- Mobile
- future Shadecode products

### Track 8: Survival Architecture

- provider independence
- model independence
- deployment independence
- storage independence
- monetization alternatives
- explicit product pivots

---

## 17. Non-Negotiable Principles

1. **Do not make an LLM the reasoning engine for everything.**
2. **Do not make cloud connectivity a requirement for basic learning.**
3. **Do not tie Shadecode to one model provider.**
4. **Do not optimize parameter count instead of actual educational capability.**
5. **Do not add AI features without measuring whether they improve learning.**
6. **Do not allow the student-facing intelligence and developer automation to become one inseparable system.**
7. **Do not let a failed product hypothesis destroy the underlying platform.**
8. **Do not choose local models before benchmarking them on Shadecode-specific tasks.**
9. **Prefer structured intelligence and retrieval over unnecessary generation.**
10. **Build interfaces around stable capabilities so implementations can change underneath them.**

---

## 18. Definition of the Breakthrough

The breakthrough is not simply:

- a smaller model
- an offline chatbot
- a prettier dashboard
- another AI tutor

The intended breakthrough is the combination of:

> **a persistent student model + curriculum learning graph + deterministic learning engine + specialized local intelligence + adaptive model routing + cloud escalation + offline synchronization + continuous experimentation.**

If successful, Shadecode Student becomes less like a collection of AI features and more like a **personal learning operating system**.

The architecture should make the system progressively more useful as it observes learning outcomes, while becoming progressively less dependent on expensive remote inference for routine work.

---

## 19. Immediate Next Step

Before implementing the full program, create a research/benchmark phase that answers:

1. Which local runtimes can realistically run on target student devices?
2. Which small models perform well on Shadecode-specific tutoring/classification tasks?
3. What is the smallest model that achieves acceptable quality for each task?
4. How much quality is lost under INT8/INT4 or other compression methods?
5. Which capabilities can be fully deterministic?
6. Which capabilities genuinely require an LLM?
7. What should run locally versus remotely?
8. What is the storage, memory, latency, battery, and cost profile?
9. What architecture allows the same intelligence layer to serve web, mobile, desktop, and future Shadecode products?
10. What measurements would prove that Cortex Nova is actually better than the current architecture?

Only after these questions are benchmarked should production model choices be locked.

---

**Document status:** Direction approved for investigation. Individual technical choices remain hypotheses until benchmarked.
