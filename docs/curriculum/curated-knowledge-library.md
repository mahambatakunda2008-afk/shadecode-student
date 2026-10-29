# Shadecode Student curated knowledge library

## Purpose
Build a dependable, offline-capable knowledge layer for cases where a model is unavailable, slow, or produces unreliable work. A curated lesson is authored and checked content, not a generated response and not a copied textbook chapter.

## Source and copyright policy
- Use supplied textbooks to understand scope, terminology, sequencing, and pedagogy.
- Write explanations, worked examples, practice questions, and diagrams in original wording.
- Do not ingest or redistribute textbook pages, figures, answer keys, or end-of-chapter questions wholesale.
- Record the source edition and exact syllabus mapping separately from the authored content.
- Do not label content verified until calculations, terminology, syllabus scope, diagrams, and answers have been reviewed independently.

## Programme-wide coverage mandate

**Product requirement: comprehensive ZIMSEC and Cambridge secondary-school coverage, across all relevant high-school levels and subjects.** The current curated modules are small runtime pilots and must never be mistaken for broad curriculum coverage.

### Programme and level coverage

Maintain separate, versioned curriculum maps rather than assuming similarly named subjects or levels are interchangeable.

| Programme track | Coverage target | Required mapping |
|---|---|---|
| Zimbabwe national pathway (ZIMSEC) | Secondary Forms 1–4, including the applicable junior-secondary learning stages and O Level syllabuses; A Level Forms 5–6 where offered | Official subject syllabus, syllabus/examination code, examination year, topic/subtopic, practical/coursework/oral requirements, assessment objectives, paper structure and allowed resources |
| Cambridge pathway | Lower Secondary where relevant to a learner's entry point; Cambridge IGCSE/O Level; AS Level; full A Level | Exact Cambridge syllabus code and examination year, topic/subtopic, practical/coursework/oral requirements, assessment objectives, paper structure and allowed resources |
| School-specific and mixed pathways | Learners taking a mixture of boards, levels or subject options | Per-learner subject/level/board selection, with explicit mapping for shared concepts and separate board-specific expectations |

The pathway labels above define the product's intended reach, not a claim that every subject or stage has already been mapped. Confirm each level and subject against current official documentation before marking it available or verified. Do not assume ZIMSEC and Cambridge syllabuses are equivalent because the subject names match.

### Subject catalogue and personalisation

Build a discoverable subject catalogue that can expand without hard-coding only Mathematics and Physics. Candidate subject families to audit against the actual offerings for each programme include languages and literature; Mathematics and additional/further mathematics where applicable; Biology, Chemistry, Physics and other sciences; Computer Science/ICT; Geography; History; Commerce/business/economics/accounting; agriculture; and practical, technical, creative and vocational subjects. This is an audit queue, not a statement that every listed subject exists at every level or under both boards.

Each subject entry must state its supported board, level, syllabus year, language, topic coverage, assessment modes, practical/resource requirements and confidence status. Onboarding and settings must let learners select their actual board, level, subjects and examination year. The app must not show a subject as fully supported merely because a single lesson or a generic AI response exists. Optional/specialist subject modules should be shown only when relevant to the learner's selections, while still remaining discoverable in subject settings.

### Minimum completion criteria for each subject-level-syllabus version

1. **Syllabus inventory:** every official topic and subtopic is accounted for, with a coverage state: not started, outlined, authored, checked, syllabus-mapped, or verified.
2. **Learning pathway:** prerequisites, ordered lessons, objectives, vocabulary, examples, misconceptions, retrieval practice and spaced review.
3. **Assessment readiness:** original exam-style questions across relevant difficulty levels; step-by-step marking guidance; command words; common lost-mark patterns; and explicit mapping to assessment objectives.
4. **Subject-specific modes:** required graphs, labelled diagrams, map work, source analysis, essays, programming, calculations, experiments, practical skills, coursework or oral work, as appropriate to the syllabus. Text-only lessons are insufficient where visual or practical assessment is required.
5. **Answer quality:** independently checked calculations, units, accepted alternatives, mark allocations and explanations. Tests can catch regressions but do not replace subject-expert review.
6. **Offline readiness:** versioned downloadable lessons and eligible openly licensed or authorised resources, with integrity checks, clear storage size, update management and a graceful no-network learning path. A runtime fallback is not itself an offline content pack.
7. **Coverage transparency:** a learner/guardian/teacher can see exactly what is covered, what remains incomplete, the syllabus year, and when content was last checked.
8. **Release gate:** no subject/level is advertised as comprehensive until all official syllabus items are mapped, required assessment modes are represented, answer checks and independent review are complete, and offline behaviour has been tested.

### Content provenance and resource rights

Use current official ZIMSEC and Cambridge syllabuses and assessment documentation as the mapping authority, recording document title, version/year, URL or source reference, and date checked. Use supplied books to guide teaching sequence and explanations, but create original explanations, examples and exam-style questions. Include past papers, mark schemes, diagrams or textbook-derived material in an offline pack only when the licence, copyright exception or permission permits the intended distribution. Do not scrape and redistribute copyrighted books or papers wholesale. Where redistribution is not permitted, provide lawful source links and let users import files they are entitled to use.

### Coverage ledger and rollout order

Track completion at the atomic topic/subtopic level, not merely by the number of lesson files. First establish the official syllabus inventory for every selected programme/level/subject; then prioritise high-enrolment core subjects and exam-critical gaps; then expand to electives and practical/technical subjects. Keep ZIMSEC and Cambridge coverage separate in reporting, and publish a truthful coverage percentage based on mapped syllabus items rather than authored lesson count.

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
- `src/lib/cortex/curatedContent/pure-mathematics-trigonometric-equations.ts`: original lesson on reference angles, quadrant signs, periods, and equations with multiple angles. Draft only until independently checked against the exact Cambridge 9709 syllabus year and relevant chapter coverage.

## Runtime integration status

The original pilot modules are wired into deterministic lesson fallback retrieval:
- `physics|kinematics` serves the original kinematics lesson for Physics requests, including syllabus-coded labels such as Cambridge 9702.
- `physics|accelerated motion` serves an original accelerated-motion lesson with worked calculations, graph reasoning, free-fall conventions and projectile components.
- `mathematics|algebra` serves the original algebra lesson for Mathematics/Pure Mathematics requests, including syllabus-coded labels such as Cambridge 9709.
- `mathematics|logarithms and exponential functions` serves the original logarithms lesson for Mathematics/Pure Mathematics requests. Its graph sketch instructions, worked examples, practice and subject-isolation tests are wired into deterministic fallback retrieval. Short requests using `logarithms` or `exponential functions` also resolve to this lesson.
- `mathematics|trigonometric equations` serves an original lesson on solving sine, cosine and tangent equations over a stated interval; `trig equations` is also an accepted short alias. Multiple-angle examples explicitly transform the interval before solving.
- The fallback tests cover positive retrieval, required teaching structure, and subject isolation.

**Important:** runtime availability is not a verification claim. Both modules remain drafts. The Mathematics PDF is image-based and its contents were read with OCR, so its detailed syllabus mapping still needs manual checking. The deterministic fallback modules are bundled with the application code, so these two lessons do not require an AI/network call once the app shell and JavaScript bundle are available locally. This is still not a complete downloadable, versioned curriculum pack.

Offline packs now also carry optional `provenance` metadata: verification status (`unreviewed`, `content-checked`, `syllabus-mapped`, or `verified`), source title/edition, syllabus authority/year, author, reviewer, review date, and review notes. Legacy packs without this metadata normalize to `unreviewed`, never to verified. The prompt context explicitly distinguishes content checking from syllabus mapping and instructs the model not to upgrade a pack's status. This is metadata enforcement at the context boundary, not proof that someone has actually completed a review; a `verified` value must only be assigned after both content review and exact syllabus mapping have genuinely happened. Unit tests cover legacy packs, source details, status distinctions, and absent packs.

The pack store now exposes async `readOfflineCurriculumPackDurable` and `writeOfflineCurriculumPackDurable` APIs backed by the existing IndexedDB `records` store, with the v2 localStorage pack retained as a backwards-compatible mirror and lazy migration source. The lesson-generation recovery path now reads packs asynchronously from IndexedDB first, rehydrates the legacy localStorage mirror for existing synchronous consumers, and the curriculum-grounding cache writes packs to both stores. This is an incremental browser-runtime integration, not proof of device-level reliability: quota failures, private browsing, Android WebView lifecycle behaviour, and actual offline cold-start still require browser/PWA and Android WebView testing. The existing synchronous localStorage functions remain for compatibility.

## Source mapping for the first pilots

| Pilot | Source-derived scope | Status |
|---|---|---|
| Physics kinematics | *Physics for Cambridge International AS & A Level Coursebook*, syllabus 9702 (examination from 2022): speed, distance/displacement, scalar/vector, velocity, displacement-time graphs, vector operations. | draft; runtime connected |
| Physics accelerated motion | Same coursebook: acceleration, equations of motion, experimental measurement, gravity and projectiles. Lesson content is original and uses standard ideal-model assumptions explicitly. | draft; runtime connected |
| Physics momentum and impulse | Original lesson on signed momentum, impulse, force-time graph area, conservation of momentum, and one-dimensional collisions. Guided by the supplied Cambridge International AS & A Level Physics coursebook topic sequence; exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |
| Pure Mathematics algebra | *Complete Pure Mathematics for Cambridge International AS & A Level*, Second Edition, syllabus 9709: modulus, sketching modulus graphs, polynomial division, remainder theorem, factor theorem. The book's contents place this in Chapter 1. | draft; runtime connected |
| Pure Mathematics logarithms and exponentials | *Complete Pure Mathematics for Cambridge International AS & A Level*, Second Edition: topic heading visible in the OCR-read contents. Detailed chapter coverage and exact syllabus-year mapping are not yet independently verified. | draft; runtime connected |
| Pure Mathematics differentiation | Original authored starter covering derivative meaning, first principles, power and chain rules, tangents and stationary points. Exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |
| Pure Mathematics sequences and series | Original authored starter covering arithmetic/geometric nth terms and finite sums, plus the convergence condition for an infinite geometric series. Exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |
| Pure Mathematics trigonometric equations | Original authored starter covering reference angles, quadrant signs, periods, exact-angle solution sets and multiple-angle interval handling. Exact syllabus-year mapping and independent review remain outstanding. | draft; runtime connected |

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
6. Independently review the differentiation starter, verify all worked answers, and map it to the exact current 9709 syllabus before changing its draft status.
7. Independently review the sequences/series starter, verify each formula and answer, and map it to the exact current 9709 syllabus before changing its draft status.
8. Independently review the trigonometric-equations starter, verify every solution set and map it to the exact current 9709 syllabus before changing its draft status.
9. Add a runtime registry only after each entry passes independent content review and exact syllabus mapping.
10. Add local retrieval and download packaging, with versioning and a visible distinction between curated content and AI-generated content.


### Pure Mathematics differentiation starter (draft)

Added an original teaching sequence on derivative meaning, first principles for x², polynomial differentiation, the chain rule, tangent equations and stationary-point classification. A learner-drawn curve/tangent prompt is included. Regression tests cover the numerical examples and lesson structure. This is a draft, not a claim of exact syllabus coverage or independent examiner approval.


### Pure Mathematics sequences and series starter (draft)

Added original instruction on arithmetic and geometric nth terms, finite sums, convergence of infinite geometric series, and a learner-drawn terms/partial-sums sketch. Numerical regression tests and runtime matching checks cover the authored examples and subject isolation. This remains draft content until independent mathematical review and exact syllabus mapping are complete.


### Pure Mathematics trigonometric equations starter (draft)

Added original instruction for solving sine, cosine and tangent equations over a stated interval, using reference angles and quadrant signs, and handling multiple-angle equations by transforming the interval before solving. The learner-drawn quadrant guide and automated checks cover representative exact-angle solutions. This remains draft content until independent mathematical review and exact syllabus mapping are complete.


### Physics momentum and impulse starter (draft)

Added an original offline lesson covering signed momentum, impulse as change in momentum, force-time graph area, one-dimensional conservation of momentum, collisions, and why longer stopping time reduces average force. The worked examples state a positive direction and carry signs through the calculation; practice answers are included. Runtime retrieval tests cover the topic and subject isolation. These checks do not replace independent physics review or exact current-syllabus mapping, so the lesson remains a draft.
