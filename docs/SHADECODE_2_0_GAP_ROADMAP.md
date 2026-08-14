# Shadecode 2.0 — Gap & Systems Roadmap

**Status:** Strategic baseline, August 2026  
**Purpose:** Define the gaps that matter beyond the current feature backlog and turn them into an execution order.

## 1. Product direction

Shadecode Student should evolve from an AI study assistant into an **academic operating system**: a system that understands a learner's academic context, helps them learn and practice, manages workload and assessment preparation, and adapts to evidence over time.

The product should support secondary education, universities, polytechnics, colleges and technical/vocational pathways without forcing those pathways into a secondary-school-only data model.

## 2. Critical gaps

### P0 — Tertiary education model

Support institution, qualification/program, course/module, academic period, credits, assessment, coursework, labs, projects, research and GPA/grade context.

**Rule:** define the generic academic model before building institution-specific integrations.

### P0 — Student knowledge and mastery graph

Move from isolated activity records to evidence-backed topic state. Track mastery, confidence, evidence, recency, misconceptions and decay. Connect subjects/courses to topics, questions, mistakes, lessons and assessments.

Use the existing `topic_mastery` implementation as the starting point. Do not create a competing mastery system.

### P0 — Assessment and past-paper intelligence

Make legitimate past papers, mark schemes, syllabuses and question metadata machine-readable. Map questions to curriculum topics, classify difficulty and mistakes, and use assessment evidence to drive revision recommendations.

### P0 — Offline-first architecture

Treat local persistence, queued mutations, synchronization and conflict handling as first-class architecture. Cache high-value learning resources for intermittent connectivity. Keep future peer-to-peer exchange optional rather than making it an MVP dependency.

### P0 — Cortex 2.0

Separate student-facing Cortex from Cortex Engineering. Student Cortex should progressively combine memory, knowledge state, planning, forecasting and specialized capabilities. Add model routing, semantic caching and local/cheap inference where they materially reduce cost or latency.

### P0 — Security, privacy and academic integrity

Audit authentication, authorization/RLS, API boundaries, service-role usage, uploads, secrets, rate limits, data isolation and AI-provider boundaries. Define privacy boundaries between students, parents, teachers and institutions. Add graduated academic-integrity safeguards rather than blindly completing assessed work.

### P0 — Observability and product intelligence

Instrument activation, retention, feature usage, AI failures, sync failures, latency and AI cost. Engineering decisions should increasingly follow real product evidence.

## 3. Ecosystem gaps

### P1 — SCS ↔ Student

Connect school identity, classes, subjects, teachers, attendance, results and announcements to learning intelligence where permissions allow. Administrative views must not automatically expose private learning data.

### P1 — Teacher and lecturer platform

Educators should eventually create/import learning material and assessments, receive class-level weakness summaries, and distribute high-quality content into student learning flows.

### P1 — Content and knowledge infrastructure

Create a provenance-aware ingestion, versioning, curriculum-mapping, search and retrieval layer. Prioritize official syllabuses, past papers/mark schemes and high-value practice material.

### P1 — Collaboration

Study rooms, shared notes, group challenges, peer explanations and institution/course communities. Moderation, permissions and privacy must precede open community scale.

### P1 — Unified Shadecode identity

A shared identity and permission model should eventually span Student, SCS and future Shadecode products while keeping data appropriately separated by role and product.

### P1 — Business and distribution

Test value and willingness to pay across students, parents, schools, universities, polytechnics and institutions. Do not optimize monetization before activation and retention reveal the strongest value loops.

### P1 — Zimbabwe → Africa readiness

Optimize for low data, intermittent connectivity, mobile-first access, low-end hardware and local curricula/qualifications. Zimbabwe is an initial validation environment, not the product's ceiling.

## 4. Long-horizon research

- **Education P2P network:** optional device-to-device exchange of permitted educational assets.
- **Academic digital twin:** only after knowledge and assessment evidence are mature.
- **Multi-agent Cortex:** Tutor, Planner, Coach, Analyst, Creator, Career and Community capabilities should emerge from validated use cases.
- **Marketplace/creator economy:** educator and student resources with provenance, moderation and quality signals.
- **Science/hardware/global network:** virtual labs, simulation, Learning Box and broader network concepts remain future products.

## 5. Immediate execution order

1. **Tertiary academic model discovery/specification.** Audit existing profile, subject, exam, study-topic and onboarding structures before changing data.
2. **Assessment/past-paper audit.** Audit current ingestion and syllabus mapping; define canonical question/topic/assessment concepts.
3. **Offline sync audit.** Inventory persistence, caching and mutation paths; define a sync contract.
4. **Security audit.** Review auth, RLS, API routes, service-role boundaries, uploads and AI-provider exposure.
5. **Observability audit.** Identify the minimum product-health and AI-cost events needed to steer development.
6. **Implement the smallest validated slice.** Avoid speculative platform rewrites.

## 6. Anti-scope-creep rules

- Do not build every future idea simultaneously.
- Search for existing implementations before creating new systems.
- Do not create duplicate data models or engines.
- Do not replace real curriculum or assessment evidence with fabricated AI content.
- Do not make P2P, digital twins or multi-agent architecture prerequisites for current student value.
- Do not build native apps merely for completeness; justify them with product evidence.

## 7. Definition of success

Shadecode 2.0 is successful when Cortex can answer, with evidence:

> **Who is this learner, what are they trying to achieve, what do they know, what are they likely to struggle with, what should they do next, and why?**

And when the system can deliver that value reliably despite limited connectivity, different education systems and different learner contexts.
