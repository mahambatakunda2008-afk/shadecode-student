# Shadecode Student curated knowledge library

## Purpose
Build a dependable, offline-capable knowledge layer for cases where a model is unavailable, slow, or produces unreliable work. A curated lesson is authored and checked content, not a generated response and not a copied textbook chapter.

## Source and copyright policy
- Use supplied textbooks to understand scope, terminology, sequencing, and pedagogy.
- Write explanations, worked examples, practice questions, and diagrams in original wording.
- Do not ingest or redistribute textbook pages, figures, answer keys, or end-of-chapter questions wholesale.
- Record the source edition and exact syllabus mapping separately from the authored content.
- Do not label content verified until calculations, terminology, syllabus scope, diagrams, and answers have been reviewed independently.

## Teaching structure observed in the supplied materials
The Oxford Pure Mathematics book's introductory pages describe objectives, prerequisite checks (Before you start), worked examples, graded exercises from basic to exam standard, real-world links, chapter summaries, glossary and concise answers. Use these as pedagogical cues, not as a template to copy verbatim.
The Cambridge Physics coursebook is a 907-page searchable PDF. Its detailed contents and topic-by-topic mapping still need extraction and review before claiming complete syllabus coverage.

## Content contract
Every lesson should provide, where relevant:
1. Syllabus and learner-level metadata.
2. Prerequisites and explicit learning objectives.
3. Short explanations with symbols and units defined.
4. Original worked examples with visible reasoning steps.
5. Diagrams, graphs, circuit/particle sketches or labelled diagram tasks when the topic needs them.
6. Checkpoints that do not immediately reveal their own answers.
7. Common misconceptions and correction guidance.
8. Practice with independently checked answers.
9. Exam technique linked to the applicable assessment objectives.
10. Provenance, author/reviewer, verification status, version and review date.

## Status labels
- draft: content exists but has not completed review.
- checked: calculations and answers have been independently checked.
- syllabus-mapped: topic has been matched against a specific syllabus and year.
- verified: both content review and syllabus mapping are complete.
Never imply a higher status than the evidence supports.

## Pilot content
- `src/lib/cortex/curatedContent/physics-kinematics.ts`: original introductory kinematics lesson. Draft only until independently checked against the exact Cambridge Physics syllabus version and the relevant coursebook chapter.
- `src/lib/cortex/curatedContent/pure-mathematics-algebra.ts`: original algebra lesson on modulus, polynomial division, remainder theorem and factor theorem. Draft only until independently checked against the exact Cambridge 9709 syllabus year and the relevant Pure 2/3 chapter coverage.

## Runtime integration status

The two pilot modules are now wired into deterministic lesson fallback retrieval:
- `physics|kinematics` serves the original kinematics lesson for Physics requests, including syllabus-coded labels such as Cambridge 9702.
- `mathematics|algebra` serves the original algebra lesson for Mathematics/Pure Mathematics requests, including syllabus-coded labels such as Cambridge 9709.
- The fallback tests cover positive retrieval, required teaching structure, and subject isolation.

**Important:** runtime availability is not a verification claim. Both modules remain drafts. The Mathematics PDF is image-based and its contents were read with OCR, so its detailed syllabus mapping still needs manual checking. Neither pilot is yet proven to be part of a durable, versioned offline content pack. The existing fallback can serve content when provider generation fails, but that is not equivalent to a complete offline-first learning experience.

## Source mapping for the first pilots

| Pilot | Source-derived scope | Status |
|---|---|---|
| Physics kinematics | *Physics for Cambridge International AS & A Level Coursebook*, syllabus 9702 (examination from 2022): speed, distance/displacement, scalar/vector, velocity, displacement-time graphs, vector operations. Accelerated motion is the next chapter and must be mapped as a separate lesson. | draft; runtime connected |
| Pure Mathematics algebra | *Complete Pure Mathematics for Cambridge International AS & A Level*, Second Edition, syllabus 9709: modulus, sketching modulus graphs, polynomial division, remainder theorem, factor theorem. The book's contents place this in Chapter 1. | draft; runtime connected |

The lessons use original explanations and examples. The source books guide scope and teaching sequence; textbook prose, figures and end-of-chapter questions are not copied into the app.

## Next curation queue
1. Extract the Physics book's contents and map kinematics to the current Cambridge syllabus.
2. Inspect the Oxford Pure Mathematics contents and create a syllabus map for Pure 2 and Pure 3.
3. Expand the Mathematics pilot to include modulus graph sketches and further polynomial-division examples, with answer checks.
4. Add tests that recompute every numerical answer and reject topic drift.
5. Add a runtime registry only after each entry passes review and tests.
6. Add local retrieval and download packaging, with versioning and a visible distinction between curated content and AI-generated content.
