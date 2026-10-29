# Curated lesson syllabus-mapping register

**Purpose:** prevent a useful lesson draft from being mistaken for complete or syllabus-verified coverage. This register is intentionally conservative. A textbook chapter heading is not proof that every lesson point is required by a specific exam syllabus.

## Review statuses

- **draft** — original content exists; not independently checked.
- **checked** — a named reviewer has checked the subject content and worked answers.
- **syllabus-mapped** — every lesson section is mapped to exact syllabus learning outcomes and exam year.
- **verified** — subject review, syllabus mapping, answer tests, presentation/diagram checks, and regression tests are complete.

A lesson must not move to a higher status because CI passes. CI checks software structure and selected calculations; it does not certify academic correctness or curriculum coverage.

## Current starter register

| Content file | Intended learner route | Candidate scope | Current status | Must happen before runtime fallback |
| --- | --- | --- | --- | --- |
| `src/lib/cortex/curatedContent/physics-kinematics.ts` | Cambridge International AS & A Level Physics 9702, exams 2025–2027; re-map separately for 2028–2030 | Introductory kinematics: distance/displacement, speed/velocity, acceleration, motion graphs, constant-acceleration equations | draft | Compare every block against exact syllabus statements; review signed quantities and worked answers; add graph/diagram data; add independent review and request-to-content lookup tests |
| `src/lib/cortex/curatedContent/pure-mathematics-algebra.ts` | Cambridge International AS & A Level Mathematics 9709, exams 2026–2027; re-map separately for 2028–2030 | Modulus, polynomial division, remainder theorem, factor theorem | draft | Verify that each topic and expected depth matches the relevant 9709 syllabus route/paper; review all answers; add graph/diagram data; add independent review and request-to-content lookup tests |

## Official syllabus sources to use

1. Cambridge International Physics 9702 qualification page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/
   - The page lists the 2025–2027 syllabus and the 2028–2030 syllabus.
   - Official 2025–2027 PDF: https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf
2. Cambridge International Mathematics 9709 qualification page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/
   - The page lists the 2026–2027 syllabus and the 2028–2030 syllabus.
   - Official 2026–2027 PDF: https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf

Always re-open the official qualification page before a mapping pass. Syllabus versions can change, and a future syllabus must not silently replace the exam year selected by the learner.

## Mapping checklist

For each lesson, record:

- qualification code, syllabus year/version, and paper/route where relevant;
- exact syllabus section and learning-outcome identifiers;
- each lesson block mapped to one or more learning outcomes, or marked as optional prerequisite/context;
- what the lesson deliberately does **not** cover;
- independent subject reviewer and review date;
- checked worked-answer results and test coverage;
- whether required diagrams, graphs, sketches, tables, or practical components are present;
- a regression test that proves the topic resolver returns this lesson only for appropriate subject/topic requests.

## Runtime safety rule

Do not add these draft lessons to deterministic fallback retrieval yet. Until the mapping and review gates are complete, returning a polished but mismatched lesson when AI fails could mislead a learner. Keep the existing strict “no matching lesson is better than the wrong lesson” recovery behaviour.
