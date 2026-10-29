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
- `src/lib/cortex/curatedContent/physics-accelerated-motion.ts`: original lesson on acceleration, velocity-time graphs, constant-acceleration equations, free fall and projectile components. Draft only until independently checked against the exact Cambridge Physics syllabus version and relevant coursebook chapter.
- `src/lib/cortex/curatedContent/pure-mathematics-algebra.ts`: original algebra lesson on modulus, polynomial division, remainder theorem and factor theorem. Draft only until independently checked against the exact Cambridge 9709 syllabus year and the relevant Pure 2/3 chapter coverage.
- `src/lib/cortex/curatedContent/pure-mathematics-logs-exponentials.ts`: original lesson on logarithm meaning and laws, exponential/logarithmic graphs, solving equations and domain restrictions. Draft only until independently checked against the exact Cambridge 9709 syllabus year and relevant chapter coverage.

## Runtime integration status

The two pilot modules are now wired into deterministic lesson fallback retrieval:
- `physics|kinematics` serves the original kinematics lesson for Physics requests, including syllabus-coded labels such as Cambridge 9702.
- `physics|accelerated motion` serves an original accelerated-motion lesson with worked calculations, graph reasoning, free-fall conventions and projectile components.
- `mathematics|algebra` serves the original algebra lesson for Mathematics/Pure Mathematics requests, including syllabus-coded labels such as Cambridge 9709.
- `mathematics|logarithms and exponential functions` serves the original logarithms lesson for Mathematics/Pure Mathematics requests. Its graph sketch instructions, worked examples, practice and subject-isolation tests are wired into deterministic fallback retrieval. Short requests using `logarithms` or `exponential functions` also resolve to this lesson.
- The fallback tests cover positive retrieval, required teaching structure, and subject isolation.

**Important:** runtime availability is not a verification claim. Both modules remain drafts. The Mathematics PDF is image-based and its contents were read with OCR, so its detailed syllabus mapping still needs manual checking. The deterministic fallback modules are bundled with the application code, so these two lessons do not require an AI/network call once the app shell and JavaScript bundle are available locally. This is still not a complete downloadable, versioned curriculum pack.

Offline packs now also carry optional `provenance` metadata: verification status (`unreviewed`, `content-checked`, `syllabus-mapped`, or `verified`), source title/edition, syllabus authority/year, author, reviewer, review date, and review notes. Legacy packs without this metadata normalize to `unreviewed`, never to verified. The prompt context explicitly distinguishes content checking from syllabus mapping and instructs the model not to upgrade a pack's status. This is metadata enforcement at the context boundary, not proof that someone has actually completed a review; a `verified` value must only be assigned after both content review and exact syllabus mapping have genuinely happened. Unit tests cover legacy packs, source details, status distinctions, and absent packs.

The pack store now exposes async `readOfflineCurriculumPackDurable` and `writeOfflineCurriculumPackDurable` APIs backed by the existing IndexedDB `records` store, with the v2 localStorage pack retained as a backwards-compatible mirror and lazy migration source. The lesson-generation recovery path now reads packs asynchronously from IndexedDB first, rehydrates the legacy localStorage mirror for existing synchronous consumers, and the curriculum-grounding cache writes packs to both stores. This is an incremental browser-runtime integration, not proof of device-level reliability: quota failures, private browsing, Android WebView lifecycle behaviour, and actual offline cold-start still require browser/PWA and Android WebView testing. The existing synchronous localStorage functions remain for compatibility.

## Source mapping for the first pilots

| Pilot | Source-derived scope | Status |
|---|---|---|
| Physics kinematics | *Physics for Cambridge International AS & A Level Coursebook*, syllabus 9702 (examination from 2022): speed, distance/displacement, scalar/vector, velocity, displacement-time graphs, vector operations. | draft; runtime connected |
| Physics accelerated motion | Same coursebook: acceleration, equations of motion, experimental measurement, gravity and projectiles. Lesson content is original and uses standard ideal-model assumptions explicitly. | draft; runtime connected |
| Pure Mathematics algebra | *Complete Pure Mathematics for Cambridge International AS & A Level*, Second Edition, syllabus 9709: modulus, sketching modulus graphs, polynomial division, remainder theorem, factor theorem. The book's contents place this in Chapter 1. | draft; runtime connected |
| Pure Mathematics logarithms and exponentials | *Complete Pure Mathematics for Cambridge International AS & A Level*, Second Edition: topic heading visible in the OCR-read contents. Detailed chapter coverage and exact syllabus-year mapping are not yet independently verified. | draft; runtime connected |
| Pure Mathematics differentiation | Original authored starter covering derivative meaning, first principles, power and chain rules, tangents and stationary points. Exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |\n| Pure Mathematics sequences and series | Original authored starter covering arithmetic/geometric nth terms and finite sums, plus the convergence condition for an infinite geometric series. Exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |

The lessons use original explanations and examples. The source books guide scope and teaching sequence; textbook prose, figures and end-of-chapter questions are not copied into the app.



### Pure Mathematics logarithms/exponentials validation (draft)

The automated checks evaluate the product, quotient and power laws numerically; substitute candidate solutions into exponential and logarithmic equations; reject zero/negative logarithm arguments; check graph coordinates and asymptotes; and guard against the false rule that a logarithm of a sum equals a sum of logarithms. They are regression checks for the authored examples, not independent mathematical review or syllabus verification; the lesson remains a draft.

### Pure Mathematics algebra expansion (draft)

The algebra pilot now has a stepwise modulus-graph routine, a worked sketch of \`y = |x² − 4|\` with its piecewise definition, and a polynomial-division example with a non-zero remainder. The practice set includes a second division calculation and explicit checks by expanding \`P(x) = D(x)Q(x) + R(x)\`. Tests verify the division identities at multiple values and check modulus-graph roots and the reflected central value. These are arithmetic/structure checks, not independent examiner review or exact current-syllabus verification; the lesson remains a draft.

## Next curation queue
1. Map the Physics kinematics and accelerated-motion lessons to the exact current Cambridge syllabus and have a second reviewer check every numerical answer.
2. Inspect the Oxford Pure Mathematics contents and create a syllabus map for Pure 2 and Pure 3.
3. Independently check the logarithms/exponentials worked answers and map the lesson to the exact current Cambridge 9709 syllabus before upgrading its status.
4. Extend the Mathematics pilot with further Pure 2/Pure 3 topics only after checking the supplied book contents and current syllabus map.
5. Expand automated answer checks to every numerical result and add topic-drift checks.
6. Independently review the differentiation starter, verify all worked answers, and map it to the exact current 9709 syllabus before changing its draft status.\n7. Independently review the sequences/series starter, verify each formula and answer, and map it to the exact current 9709 syllabus before changing its draft status.
7. Add a runtime registry only after each entry passes independent content review and exact syllabus mapping.
8. Add local retrieval and download packaging, with versioning and a visible distinction between curated content and AI-generated content.


### Pure Mathematics differentiation starter (draft)

Added an original teaching sequence on derivative meaning, first principles for x², polynomial differentiation, the chain rule, tangent equations and stationary-point classification. A learner-drawn curve/tangent prompt is included. Regression tests cover the numerical examples and lesson structure. This is a draft, not a claim of exact syllabus coverage or independent examiner approval.
\n\n### Pure Mathematics sequences and series starter (draft)\n\nAdded original instruction on arithmetic and geometric nth terms, finite sums, convergence of infinite geometric series, and a learner-drawn terms/partial-sums sketch. Numerical regression tests and runtime matching checks cover the authored examples and subject isolation. This remains draft content until independent mathematical review and exact syllabus mapping are complete.\n