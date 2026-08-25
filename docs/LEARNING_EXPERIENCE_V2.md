# Shadecode Student Learning Experience v2

**Status:** Product + engineering specification
**Date:** 2026-08-25
**Scope:** Learn, lesson generation, Exam Simulation, books/library, Cortex, StudySpace, Workmate, assessment, diagrams, retrieval, personalization, and cross-module learning loops.

## 1. North Star

Shadecode Student must not generate content that merely *looks educational*. It should produce material that teaches, tests, reveals misconceptions, and creates curiosity.

A successful lesson should leave the student able to:

1. explain the core idea in their own words;
2. use it in a familiar problem;
3. transfer it to an unfamiliar problem;
4. connect it to prerequisite and downstream concepts;
5. recognize common traps and misconceptions;
6. retrieve the important facts without looking;
7. ask a better next question.

A successful exam should feel like a deliberate assessment written by a competent examiner, not a list of AI-generated questions.

The product principle is:

> **Teach deeply. Test honestly. Show visually. Adapt continuously. Make curiosity contagious.**

## 2. The New Learning Loop

```text
                 STUDENT INTENT
                      |
          +-----------+-----------+
          |                       |
       Learn                    Prepare
          |                       |
          v                       v
   SOURCE / CURRICULUM       PAST PAPERS / SYLLABUS
          |                       |
          +-----------+-----------+
                      |
                      v
                CORTEX PLAN
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
     LESSON         PRACTICE       EXAM
        |             |             |
        +-------------+-------------+
                      |
                      v
                 WORK / DATA
                      |
                      v
              MARK + ANALYSE
                      |
          +-----------+-----------+
          |                       |
          v                       v
    MISCONCEPTION             MASTERY
          |                       |
          +-----------+-----------+
                      v
                NEXT ACTION
                      |
                      v
              NEXT LESSON / TASK
```

Every major learning action should produce structured evidence for Cortex. The product should stop treating lessons, quizzes, exams, and chat as isolated features.

## 3. Lesson Quality Standard

### 3.1 Lesson anatomy

A generated lesson should normally contain:

- title and learning promise;
- prerequisite check;
- why the topic matters;
- intuitive mental model;
- core explanation;
- worked example(s);
- visual explanation/diagram where useful;
- misconception and trap section;
- exam technique;
- comparison or connection to related concepts;
- guided practice;
- independent practice;
- retrieval check;
- transfer/challenge question;
- concise recap;
- curiosity bridge: "Where this gets interesting";
- optional deeper dive;
- sources/grounding metadata when source material was used.

The generator must adapt this structure to the subject. A physics lesson should not look like a history lesson with the nouns swapped.

### 3.2 Depth is adaptive, not bloated

"Almost everything" must not mean an enormous wall of text. Cortex should build a **coverage plan** first and then choose the shortest explanation that achieves the required coverage.

The lesson planner should explicitly track:

```text
coverage
  definitions
  principles
  relationships
  prerequisites
  applications
  examples
  misconceptions
  practical/context
  exam skills
  transfer
  unanswered curiosity
```

The UI can expose the coverage map so a student can see what they have mastered and what remains.

### 3.3 Curiosity engine

Every substantial lesson should contain at least one intellectually honest hook:

- surprising consequence;
- counterexample;
- real-world application;
- "what would happen if..." scenario;
- historical puzzle;
- unresolved edge case;
- connection to another subject.

Curiosity must not replace syllabus coverage. It is the final door, not the hallway.

## 4. Diagram-First Content

Diagrams should be a first-class content type, not images pasted into prose after generation.

### 4.1 Declarative diagram model

Use a structured, renderer-independent diagram format that can render to SVG/canvas and remain usable offline.

Conceptual shape:

```text
Diagram
  type: free_body | circuit | graph | timeline | flow | geometry |
        molecular | algorithm | architecture | data | custom
  nodes: [...]
  edges: [...]
  labels: [...]
  annotations: [...]
  equations: [...]
  altText: "..."
  caption: "..."
  interactive: true|false
```

Do not depend on an LLM producing arbitrary SVG markup directly. The model produces a constrained diagram specification; deterministic rendering produces the visual.

### 4.2 Subject-aware diagram recipes

**Mathematics**
- graphs and transformations;
- geometry constructions;
- vectors;
- probability trees;
- coordinate diagrams;
- sequences and functions.

**Physics**
- free-body diagrams;
- circuit diagrams;
- ray diagrams;
- waves;
- field lines;
- experimental setups;
- displacement-time / velocity-time graphs.

**Chemistry**
- structural formulae;
- reaction pathways;
- apparatus;
- energy profiles;
- periodic trends;
- particle models.

**Computer Science**
- flowcharts;
- trace tables;
- data structures;
- memory layouts;
- network topology;
- architecture diagrams;
- state machines.

**Biology**
- labelled structures;
- pathways;
- cycles;
- experimental setups;
- graphs and data interpretation.

Other subjects should gain their own visual grammar rather than inheriting generic diagrams.

### 4.3 Diagram interaction

Where useful, students should be able to:

- reveal labels progressively;
- tap a component for an explanation;
- hide labels and self-test;
- annotate or draw;
- compare two states;
- scrub through a process;
- answer directly on the diagram.

## 5. Exam Generation v2

The current generator already has stronger examiner-style prompting and validation. The next quality layer should make the *paper* intelligent rather than merely filtering generated questions.

### 5.1 Exam blueprint before generation

Cortex should create a blueprint first:

```text
Paper blueprint
- syllabus coverage
- topic weighting
- command-verb distribution
- cognitive demand
- question-type mix
- mark allocation
- progression
- practical/data components
- diagram opportunities
- estimated completion time
- prerequisite dependencies
```

Then generate questions against the blueprint.

### 5.2 Question-level quality gate

Each question should be checked for:

- syllabus/topic alignment;
- factual correctness;
- numerical solvability;
- mark realism;
- ambiguity;
- duplicate/near-duplicate content;
- difficulty validity;
- command-verb appropriateness;
- distractor quality for MCQs;
- answer/mark-scheme consistency;
- diagram consistency;
- accessibility/alt text.

Where possible, use deterministic validators for mathematics, units, marks, options, and schema correctness. Use a second model pass only for semantic quality review.

### 5.3 Diagrammed exams

Questions should be able to request a diagram using the same declarative diagram model as lessons.

Examples:

- "The diagram shows a circuit..."
- "Figure 1 shows the forces acting..."
- "Use the graph in Figure 2..."
- "Complete the state diagram..."

A question without a diagram should remain possible. A diagram should be used because it improves the assessment, not because the product wants visual decoration.

### 5.4 Examiner simulation

For important generated papers, Cortex should perform a hidden second pass:

1. generate;
2. solve independently;
3. compare expected solution with mark scheme;
4. detect ambiguity or impossible values;
5. revise weak questions;
6. only then expose the paper.

If verification fails, regenerate the affected question instead of silently shipping a bad one.

## 6. Book and Source Intelligence

Introduce **Shadecode Library**, an in-app reader for content the student is authorized to use.

Supported source classes should eventually include:

- textbooks/PDFs the student owns or is licensed to access;
- teacher-provided notes;
- school documents;
- syllabus/specification documents;
- past papers and mark schemes;
- personal notes;
- saved web content where permitted.

The reader should not merely display a PDF. It should become a learning source.

### 6.1 Source pipeline

```text
SOURCE
  |
  v
INGEST
  |
  +-- text extraction
  +-- page/figure detection
  +-- headings
  +-- equations
  +-- tables
  +-- captions
  +-- metadata
  |
  v
KNOWLEDGE INDEX
  |
  +-- concepts
  +-- definitions
  +-- relationships
  +-- examples
  +-- misconceptions
  +-- figures
  +-- page references
  |
  v
CORTEX RETRIEVAL
  |
  +-- explain
  +-- quiz
  +-- teach
  +-- compare
  +-- summarize
  +-- generate lesson
  +-- generate exam
```

### 6.2 Grounded generation

When generating from a book, Cortex should cite the source internally and retain page/section provenance. The lesson can show a compact "Based on your sources" panel.

The model should distinguish:

- directly supported by source;
- inferred from source;
- general curriculum knowledge;
- Cortex-added explanation.

This reduces hallucination and lets students verify claims.

### 6.3 Don't just summarize the book

The killer feature is **reconstruction**.

If a student imports a chapter, Cortex should understand the chapter's conceptual structure and then build a clearer learning path:

```text
Book chapter
     |
     v
Cortex concept map
     |
     +-- prerequisites
     +-- core ideas
     +-- examples
     +-- weak explanations
     +-- likely misconceptions
     +-- exam relevance
     |
     v
Shadecode lesson
     |
     +-- visual explanation
     +-- guided practice
     +-- adaptive questions
     +-- exam simulation
```

The book remains the source. Shadecode becomes the learning interface around it.

### 6.4 Reader UX

The reader should support:

- table of contents;
- page thumbnails;
- text selection;
- notes/highlights;
- bookmarks;
- search;
- "Explain this";
- "Teach me this page";
- "Turn this section into flashcards";
- "Generate practice";
- "Find prerequisites";
- "Show diagram";
- "Ask Cortex about this".

All actions should preserve source references.

## 7. Learn UI v2

The current Learn surface should evolve from a form-driven AI page into a **learning workspace**.

### Suggested layout

```text
+----------------------------------------------------------+
| Learn                                Cortex status  ...  |
+----------------+-----------------------------------------+
| Sources        | Topic / Lesson                           |
|                |                                         |
| Book           | [visual / diagram / equation]           |
| Notes          |                                         |
| Past papers    | explanation                              |
| Syllabus       | worked example                           |
|                |                                         |
| + Add source   | [Try it] [Check me] [Explain differently]|
+----------------+-----------------------------------------+
| Coverage  ████████░░  78%     Mastery  ██████░░  63%    |
+----------------------------------------------------------+
| Next best action: 8-minute practice on ______            |
+----------------------------------------------------------+
```

### Interaction principles

- Keep the main learning object visually dominant.
- Reduce empty form fields and generic "Generate" buttons.
- Let the student start from a topic, source, question, weak area, past paper, or goal.
- Keep Cortex available as a contextual sidecar rather than a separate destination.
- Make progress visible without turning the lesson into a dashboard.
- Support keyboard, touch, mobile and offline states.

## 8. Cortex Learning Orchestrator

Cortex should eventually receive a learning intent rather than just a string prompt.

Conceptual request:

```text
intent: learn
subject: Physics
topic: oscillations
level: AS
sourceIds: [...]
studentState: {...}
goal: understand + exam readiness
constraints:
  offline: false
  timeMinutes: 25
```

Cortex decides:

- retrieve existing content;
- generate a new explanation;
- use a source;
- generate a diagram;
- ask a diagnostic question;
- create practice;
- escalate to a stronger model;
- update the student model.

The LLM should not be responsible for all of these decisions.

## 9. New Cross-Module Capabilities

### 9.1 Concept Atlas

A visual, searchable map of the student's curriculum. Concepts connect to:

- lessons;
- questions;
- past-paper questions;
- sources;
- misconceptions;
- mastery;
- prerequisites.

### 9.2 Explain Engine

One piece of content can be explained as:

- intuitive;
- exam-ready;
- mathematical;
- visual;
- analogy-based;
- step-by-step;
- "teach me like I'm stuck".

The student can switch explanation mode without regenerating the entire lesson.

### 9.3 Socratic Mode

Instead of explaining immediately, Cortex asks targeted questions to expose the student's current mental model.

### 9.4 Exam Autopilot

Cortex can build a revision session from the student's readiness:

```text
10 min  misconception repair
15 min  targeted practice
20 min  exam question
5 min   retrieval
```

### 9.5 Question Forge

A reusable question-generation service for lessons, practice, exams, Workmate and revision. It should share the same blueprint, diagram, validation and marking infrastructure.

### 9.6 Paper Intelligence

Past papers should become searchable learning objects. Cortex can answer:

- What topics recur?
- What command verbs dominate?
- Which concepts are frequently combined?
- What are my weak areas against the paper?
- Give me questions similar in skill, not merely wording.

### 9.7 Workmate + Learn convergence

When a student brings a problem to Workmate, Cortex should be able to detect that the problem is evidence of a learning gap and offer:

> "You can solve this now, or I can repair the concept behind it first."

### 9.8 Mistake Museum

Keep a private, structured history of meaningful mistakes. Each mistake becomes a learning object with:

- what happened;
- why it happened;
- misconception;
- corrected mental model;
- similar question;
- later re-test.

This should feed adaptive revision.

### 9.9 Curiosity Graph

Track unanswered student questions and interesting adjacent concepts. A lesson can end with a few optional branches rather than a dead end.

### 9.10 Learning Replay

Let a student see how their understanding changed over time, not merely their marks.

## 10. Shared Content Contract

Lessons, questions, exams, flashcards, book sections, past papers, diagrams and Workmate responses should use shared content primitives where possible.

Suggested primitives:

```text
ContentBlock
  prose
  equation
  code
  table
  diagram
  image
  question
  worked_solution
  callout
  source_reference
  interactive
```

This prevents every feature from inventing its own rendering system.

## 11. Evaluation

Quality must become measurable.

Create benchmark suites for:

### Lesson benchmark
- factual accuracy;
- curriculum coverage;
- pedagogical completeness;
- misconception handling;
- example quality;
- curiosity quality;
- diagram usefulness;
- source grounding.

### Exam benchmark
- syllabus alignment;
- validity;
- solvability;
- mark-scheme agreement;
- difficulty calibration;
- duplication;
- diagram correctness;
- examiner realism.

### Learning-outcome benchmark
The strongest metric is not "the model liked the answer". Measure whether a student can answer a transfer question after learning.

Suggested offline regression dataset:

```text
lesson -> immediate check -> transfer question -> delayed retrieval
```

A content-generation change that produces prettier prose but worse transfer should fail the quality gate.

## 12. Safety and Trust

- Never fabricate citations or textbook pages.
- Clearly distinguish source-grounded content from generated interpretation.
- Do not ingest or redistribute copyrighted books without appropriate user rights/licensing.
- Never hide uncertainty behind authoritative prose.
- Preserve student work before network calls.
- Keep private learning data scoped to the student's account.
- Give students a way to report bad content.
- Log generator/version metadata for reproducibility without exposing secrets.

## 13. Performance and Offline Requirements

Learning content should be useful even when the connection disappears.

Offline-capable targets:

- saved lessons;
- downloaded source pages;
- questions;
- diagrams;
- flashcards;
- notes/highlights;
- mastery and spaced repetition;
- StudySpace work;
- mistake history;
- local search.

Generation may require cloud or local inference, but previously generated learning should never become inaccessible merely because the network is gone.

## 14. Implementation Order

### Phase A: Content foundation
1. shared `ContentBlock` model;
2. declarative diagram model + deterministic renderer;
3. lesson schema with coverage metadata;
4. question/exam blueprint schema;
5. quality/evaluation harness.

### Phase B: Generation quality
6. lesson planner + coverage gate;
7. examiner blueprint + solver verification;
8. shared Question Forge;
9. diagram generation for lessons/exams;
10. source-grounded generation.

### Phase C: Learn experience
11. Learn workspace redesign;
12. contextual Cortex sidecar;
13. coverage/mastery strip;
14. interactive lesson blocks;
15. better practice/retrieval transitions.

### Phase D: Shadecode Library
16. in-app reader;
17. ingestion/indexing pipeline;
18. source references;
19. selection-aware Cortex actions;
20. chapter-to-learning-path reconstruction.

### Phase E: Intelligence loops
21. Mistake Museum;
22. Concept Atlas;
23. adaptive Exam Autopilot;
24. Paper Intelligence;
25. Curiosity Graph;
26. learning replay.

### Phase F: Offline + scale
27. unify local persistence/sync around the existing StudySpace/local-first direction;
28. cache generated content and diagrams;
29. local retrieval;
30. benchmark local inference and model routing.

## 15. Definition of Done

The Learning Experience v2 work is not done when a generation endpoint returns JSON.

It is done when a student can:

1. open Learn;
2. choose a topic or source;
3. receive a coherent, deep, visually useful learning path;
4. interact with diagrams and examples;
5. practice inside the same context;
6. take a credible exam containing appropriate diagrams/data;
7. receive useful marking and misconception analysis;
8. see what to learn next;
9. revisit the source and generated explanation;
10. continue using saved content offline;
11. return later and have Cortex adapt the next session to what actually happened.

That is the target: not an AI page, but a **personal learning environment that compounds understanding**.
