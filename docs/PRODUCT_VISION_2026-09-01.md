# Shadecode Student — Expanded Product Vision

**Date:** 2026-09-01  
**Status:** Strategic product record  
**Purpose:** Capture the feature and product directions discussed during the September 1 product-design pass so they are not lost between engineering sessions.

> **Core thesis:** Shadecode Student should become an offline-first personal academic operating system, not a collection of disconnected AI study tools.

## 1. Product North Star

The core learning loop is:

**Learn → Practice → Make mistakes → Understand why → Adapt → Re-test → Master → Remember**

Cortex should continuously improve the learner's next action from real evidence. The product moat is:

**deep curriculum + persistent learner state + adaptive intervention + offline/edge intelligence + measurable learning outcomes.**

The interface should become simpler as the intelligence becomes stronger. The student should be able to open Shadecode and ask, implicitly or explicitly: **"What should I do next?"**

## 2. Cortex OS

Cortex is the intelligence layer beneath the product, not merely a chatbot.

Core capabilities:
- persistent learner memory;
- knowledge/mastery graph;
- syllabus and curriculum awareness;
- misconception tracking;
- confidence vs. correctness tracking;
- retention/forgetting detection;
- adaptive planning;
- intervention selection;
- assessment intelligence;
- explanation/tutoring;
- examining and marking support;
- project mentorship;
- career/opportunity guidance;
- model routing between local and cloud intelligence.

Potential roles are Tutor, Socratic Tutor, Examiner, Coach, Planner, Analyst, Creator, Career and Community. These should emerge from validated use cases rather than becoming isolated prompt personas.

## 3. Student Knowledge System

Build one connected knowledge graph rather than competing isolated scoring systems.

Connect:

`student → qualification → subject/course → topic → concept → prerequisite → lesson → question → attempt → mistake → mastery → retention → intervention → outcome`

Track:
- mastery;
- confidence;
- evidence;
- recency;
- decay;
- misconceptions;
- prerequisite pressure;
- cross-subject connections;
- historical improvement.

A student's knowledge should persist across education-level transitions where appropriate.

## 4. Adaptive Learning

Cortex should answer **what next**, not merely answer the current question.

Capabilities:
- adaptive daily plans;
- micro-learning sessions;
- emergency exam mode;
- weakness repair;
- spaced retrieval;
- forgetting radar;
- confidence calibration;
- prerequisite repair;
- mastery levels from Introduced → Developing → Competent → Strong → Mastered → Deep Mastery;
- teach-it-back assessment;
- reflection after sessions;
- learning-pattern detection.

Example outcome:

> "Your calculus errors are mostly caused by algebraic manipulation. Repair the prerequisite instead of drilling more calculus."

## 5. Assessment and Past-Paper Intelligence

Past papers should become machine-readable learning evidence rather than static PDFs.

Required capabilities:
- paper ingestion;
- question extraction;
- question IDs and provenance;
- syllabus/topic mapping;
- difficulty metadata;
- mark allocation;
- mark schemes;
- examiner-report context where authorized;
- mistake classification;
- question similarity;
- topic frequency analysis;
- targeted paper generation;
- paper-replica generation;
- weakness papers;
- timed quick-fire assessments;
- boss/nightmare assessments;
- post-exam intervention planning.

Exam Simulation must be grounded in real curriculum and assessment structure. Generative AI must not invent authoritative assessment facts and present them as real.

## 6. Math, Science and Practical Intelligence

### Math
- handwriting recognition;
- step-by-step working analysis;
- alternate valid solution paths;
- graph lab;
- misconception detection;
- formula book;
- similar-question generation.

### Physics/Chemistry/Biology
Subject-aware tutoring rather than generic chatbot behavior.

Physics can understand equations, units, vectors, graphs, practicals and uncertainty. Chemistry can handle equations, structures, reactions and calculations. Biology can emphasize processes, diagrams, terminology and mark-scheme language.

### Practical/Experiment Lab

`Predict → Try → Observe → Explain`

Potential capabilities:
- virtual experiments;
- measurement collection;
- graphing;
- uncertainty;
- practical planning;
- conclusion writing;
- experimental-design assessment.

## 7. Camera and Handwriting Intelligence

A major interaction should be **Snap & Learn**.

Point the camera at a textbook page, worksheet, board, diagram or handwritten work and offer:
- Explain;
- Summarise;
- Solve;
- Make flashcards;
- Create quiz;
- Find syllabus topic;
- Add to notes;
- Generate similar questions;
- Turn notebook material into revision resources.

For maths/science handwriting, distinguish the student's actual working from the final answer and explain where reasoning changes direction.

## 8. Personal Textbook and Memory Vault

Cortex can continuously assemble **My Textbook** from the learner's own notes, explanations, worked examples, mistakes and mastered concepts.

The Memory Vault should expose transparent controls for what Cortex remembers, including the ability to forget selected memories, clear topic memory, export data and delete data.

Potential generated artifacts:
- personal textbook;
- personal formula book;
- revision sheets;
- flashcards;
- concept maps;
- mistake summaries.

## 9. Learning World and Missions

Replace task-list-only motivation with meaningful missions.

Examples:
- Defeat Trigonometry;
- Repair Vectors;
- Survive a timed Physics paper;
- Complete a project phase;
- Explain a concept from memory.

Gamification should reward learning evidence rather than meaningless clicks. Existing XP, achievements, streaks and leaderboards remain useful foundations.

A visual learning map can represent curriculum coverage and mastery without becoming a noisy children's game for older students.

## 10. Education-Level Experiences

Education levels are different products sharing one intelligence foundation.

### Primary — Shadecode Discovery

Design principles:
- curiosity;
- play;
- foundations;
- visual and tactile interaction;
- age-appropriate language;
- short activities;
- safe collaboration;
- strong teacher/parent boundaries.

Potential modules:
- My Day;
- My Adventures;
- reading adventure;
- phonics and spelling;
- story generation and continuation;
- Number Village / maths world;
- puzzles and reasoning;
- draw-to-understand science;
- virtual science lab;
- geography/world explorer;
- local-language learning;
- listen-and-respond activities;
- handwriting practice;
- mental maths;
- curiosity/"I Wonder" mode;
- career exploration;
- child-friendly rewards and collections;
- persistent buildable learning world.

Primary AI communication must be child-appropriate. Teacher/parent views can expose technical learning evidence without exposing unnecessary private conversations.

### Secondary

Focus on independence, subject mastery, assignments, revision, projects and exam readiness.

### Cambridge / ZIMSEC

Focus on syllabus codes, structured topics, past papers, mark schemes, examiner language, paper-specific practice and exam strategy.

### University / Polytechnic / College / Technical-Vocational

Support institution → qualification/program → course/module → semester/term → assessment, plus assignments, coursework, labs, projects, research, GPA/grades and career pathways.

## 11. Primary-to-Tertiary Continuity

The learner's useful academic history should survive transitions between education levels.

Example:

`Primary multiplication → Secondary algebra → Cambridge calculus → University numerical methods`

Cortex should use prior mastery and prerequisite evidence without forcing incompatible curriculum structures into one UI.

## 12. Language and Local Context

Prioritize Zimbabwe initially while designing for wider African expansion.

Potential capabilities:
- English;
- Shona;
- Ndebele;
- mixed-language explanations;
- local examples and contexts;
- ZIMSEC curriculum packs;
- Cambridge curriculum packs;
- future regional curriculum packs.

Language should be more than button translation. Preserve mathematical/scientific terminology when requested.

## 13. Offline-First Architecture

Offline is a product requirement, not a fallback screen.

Offline-capable areas should progressively include:
- lessons;
- notes;
- questions;
- past papers;
- diagrams;
- progress;
- timetable;
- tasks;
- achievements;
- selected AI capabilities;
- local search;
- personal memory;
- projects.

Core flow:

`local state → queued mutation → deterministic sync → conflict resolution → cloud convergence`

Future device-to-device exchange may be researched, but P2P must not become an MVP dependency before single-device offline reliability and authenticated synchronization are mature.

## 14. Offline Learning Packs

A learner should be able to download a complete subject/level pack once and continue studying without internet.

Possible contents:
- curriculum;
- notes/resources;
- question bank;
- past papers;
- mark schemes;
- topic map;
- revision engine;
- local AI resources.

Examples:
- ZIMSEC Primary Mathematics;
- Cambridge AS Physics;
- Cambridge AS Mathematics;
- ZIMSEC O-Level Shona.

## 15. Local AI Strategy

Potential model tiers:
- **Cortex Nano:** tiny device-friendly local model;
- **Cortex Study:** stronger local educational reasoning;
- **Cortex Vision:** image/handwriting capability;
- **Cortex Math:** specialized mathematical reasoning;
- **Cortex Cloud:** optional higher-capability online model.

Router principle:

`request → local capability check → local if sufficient → cloud only when necessary`

Quantization, distillation, specialization, retrieval, caching and routing are engineering techniques. They should be evaluated by actual learning utility, latency, cost and device constraints.

## 16. Teacher and School Platform

Teacher capabilities:
- create/import material;
- create assessments;
- classroom analytics;
- weakness summaries;
- lesson planning;
- marking assistance;
- intervention recommendations;
- teacher-configured Cortex behavior.

School capabilities:
- classes;
- subjects;
- curriculum distribution;
- assignments;
- analytics;
- controlled collaboration;
- school-local content/AI infrastructure.

Teacher/AI systems should assist, not silently make high-stakes academic decisions.

## 17. School-Local Infrastructure

Long-term option:

`internet ↔ school local hub ↔ student devices`

The local hub can distribute curriculum, assessments, resources, updates and potentially local AI models. Internet becomes primarily a synchronization/update channel instead of a hard requirement for everyday learning.

Future research may include authenticated local/peer exchange, but security and privacy come first.

## 18. Collaboration

Potential features:
- study rooms;
- shared notes;
- group challenges;
- peer explanations;
- course communities;
- teacher-controlled class competitions.

Primary collaboration should remain tightly controlled. Open student communities require moderation, privacy and safety design before implementation.

## 19. Project Studio / Creation

Learning should lead to creation.

Students can build:
- websites;
- games;
- simulations;
- experiments;
- apps;
- presentations;
- research projects;
- robotics projects.

Project workspace:

`Overview → Research → Design → Code → Experiments → Data → Report → Resources → Cortex`

Cortex acts as mentor, planner, reviewer and explainer without fabricating evidence or pretending to have performed experiments.

## 20. Coding and Robotics

Primary can start with visual programming and gradually transition into text programming.

Secondary/tertiary can use:
- code lab;
- algorithm visualisation;
- debugging;
- pseudocode tracing;
- test generation;
- Python and other curriculum-relevant languages;
- Arduino/microcontroller/robotics projects where supported.

## 21. Career and Opportunity Layer

Cortex can help students explore:
- careers;
- skills;
- university programs;
- scholarships;
- internships;
- hackathons;
- competitions;
- grants;
- bootcamps.

Recommendations should explain the evidence and fit rather than deterministically assigning a career.

## 22. Analytics and Metacognition

Useful analytics include:
- mastery trajectory;
- topic risk;
- confidence calibration;
- retention/decay;
- common error type;
- session effectiveness;
- exam trajectory;
- syllabus completion risk;
- intervention outcomes.

Avoid decorative analytics that do not change a learning decision.

## 23. Privacy and Safety

Principles:
- local-first where practical;
- explicit memory controls;
- role-separated student/parent/teacher/institution data;
- server authorization and RLS remain authoritative;
- no hidden peer data sharing;
- no hidden foundation-model training dependency;
- child-safe Primary mode;
- academic-integrity-aware assistance;
- reversible and observable changes.

## 24. Product Architecture Direction

The product should eventually resemble:

```text
                    SHADECODE
                        │
          ┌─────────────┼─────────────┐
          │             │             │
      DISCOVERY      STUDENT       CAMPUS
       Primary     Secondary+   University+
          │             │             │
          └─────────────┼─────────────┘
                        │
                    CORTEX OS
                        │
              PERSONAL KNOWLEDGE GRAPH
                        │
        curriculum + evidence + interventions
                        │
              local-first intelligence
```

## 25. What Not To Build Yet

Do not let the vision become feature soup.

Current boundaries:
- no P2P dependency;
- no digital twin dependency;
- no multi-agent architecture for its own sake;
- no native apps before web/offline foundations justify them;
- no speculative hardware program as a current blocker;
- no duplicate mastery systems;
- no generic AI generation replacing real curriculum/assessment evidence.

## 26. Execution Order

### Immediate
1. Preserve and connect existing foundations before creating duplicates.
2. Harden offline/local-first operation and synchronization.
3. Expand curriculum coverage, with Primary explicitly included.
4. Finish assessment/past-paper intelligence.
5. Stabilize Learn and Exam Simulation.
6. Connect Cortex to real learning evidence.
7. Add browser/smoke/regression coverage.

### Next
1. Primary Discovery foundation and age-specific UX.
2. Concept Atlas / Knowledge Graph expansion.
3. Mistake classification and intervention loops.
4. Question Forge shared by Learn and Exam Hub.
5. Personal Textbook / Memory Vault.
6. Camera/handwriting intelligence improvements.
7. Teacher/Campus workflows.

### Later
1. Local specialized models.
2. Offline AI packs.
3. School-local hub.
4. Collaboration/P2P research.
5. Marketplace/creator economy.
6. Career/opportunity network.
7. Hardware/science platform experiments.

## 27. Definition of Success

The product is succeeding when a learner can open Shadecode with little setup and receive a useful, evidence-based next action; complete it offline if necessary; have the result preserved; and see future recommendations improve because the system learned from that interaction.

The ultimate metric is not the number of AI features.

> **Does Shadecode measurably improve what the learner does next, and does that improve learning outcomes?**
