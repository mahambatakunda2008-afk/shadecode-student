# Shadecode Student curated knowledge library

**Structured subject discovery register:** [subject-discovery-register.csv](./subject-discovery-register.csv) records catalogue evidence separately from syllabus verification. It includes 62 discovery records across Cambridge Lower Secondary, IGCSE, O Level and AS & A Level, plus ZIMSEC O Level/A Level historical-code leads. Historical evidence is explicitly not current-syllabus verification; every entry must be resolved to the applicable official syllabus before topic coverage is claimed.

**Programme-wide source and coverage tracking:** use [the curriculum resource register](./resource-register.md) for official ZIMSEC/Cambridge sources, supplementary OER and rights checks, and [the coverage ledger template](./coverage-ledger-template.csv) to track every syllabus topic at topic/subtopic level. The template contains discovery seeds only; blank topic rows mean the official syllabus has not yet been fully inventoried. Do not report those entries as mapped or verified.


**First official syllabus inventory:** [Cambridge AS & A Level Physics 9702 (2025–2027)](./cambridge-9702-2025-2027-topic-inventory.csv) records all 25 official topic titles, AS/A Level scope, source pages and assessment context. Topic titles are verified against Cambridge's official PDF; detailed subtopic/learning-outcome extraction, practical-skill mapping, lesson review and offline packaging remain pending. Do not treat this topic-level inventory as completed syllabus coverage.

**Physics AS subtopic structure:** [9702 AS subtopic index](./cambridge-9702-2025-2027-as-subtopic-index.csv) records 31 section identifiers and official subtopic titles for topics 1–11. It is a structural index only; outcome-level teaching coverage remains unverified.

**Physics practical skills:** [9702 practical skills inventory](./cambridge-9702-2025-2027-practical-skills.csv) separates Paper 3 laboratory skills from Paper 5 planning, analysis and evaluation. These assessment skills must be taught and practised explicitly, not assumed to be covered by theory lessons.

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


### Practical-skills training is a first-class learning mode

**Core product principle:** Shadecode must teach learners how to perform, interpret and communicate subject work, not only how to recall theory or answer written examination questions. Practical-skills training is a required part of curriculum coverage wherever the syllabus assesses experimental, investigative, field, technical, creative, performance, oral, programming or other applied competencies. It is not an optional enrichment feature and must not be reduced to a few theory notes or exam questions.

#### Physics 9702: concrete requirement

For Cambridge AS & A Level Physics 9702 (2025–2027), theory lessons alone are insufficient. The product must prepare learners for both:
- **Paper 3, Advanced Practical Skills:** hands-on apparatus work, manipulation, measurement and observation, recording results, tables, graph construction, analysis, conclusions and evaluation.
- **Paper 5, Planning, Analysis and Evaluation:** defining variables, designing a repeatable method, selecting apparatus, explaining controls and safety, planning data collection, analysing data, estimating uncertainty, drawing conclusions and evaluating limitations/improvements.

The syllabus recommends that at least 20% of course time is spent on practical work. Shadecode's progress model should therefore track practical competence and practice activity separately from theory-topic completion. A learner must not be shown as fully prepared for 9702 because they completed all theory lessons or a bank of multiple-choice questions.

#### Required learning experiences

For every practical or applied skill required by a syllabus, design an appropriate combination of the following. The exact mix must follow the subject and assessment mode; do not force a laboratory template onto non-laboratory subjects.

1. **Demonstration and orientation:** identify apparatus, tools, materials, software or field methods; explain purpose, safe handling, setup and limitations.
2. **Guided practice:** provide sequenced tasks in which the learner makes decisions and performs steps, rather than only reading a description of a procedure.
3. **Independent investigation:** give a question or objective, require a method, variables, observations/data, analysis and a justified conclusion.
4. **Data and evidence handling:** support structured observations, tables, units, significant figures, graphs, diagrams, calculations, uncertainty and evidence-based interpretation where relevant.
5. **Feedback on method as well as result:** assess setup, choice of method, control of variables, precision, repeatability, safety, reasoning and communication, not only the final numerical answer.
6. **Reflection and improvement:** ask learners to identify limitations, explain sources of error, propose realistic improvements and justify how those changes improve evidence quality.
7. **Assessment rehearsal:** provide original tasks that reflect the relevant practical, coursework, fieldwork, oral, performance or project assessment objectives and mark criteria without copying protected examination material.

#### Access modes: real equipment, low-cost alternatives and simulation

- **Real practical work is preferred where the syllabus requires hands-on competence.** A simulation or video must never be presented as equivalent to physically manipulating apparatus when the assessment expects the learner to do so.
- **Low-cost/local-material pathways** may help learners practise safely where school laboratories are limited. Each activity must identify required materials, substitutions, hazards, supervision needs and what competency it can and cannot demonstrate. Never recommend unsafe home experiments or mains-electricity work.
- **Interactive simulations and virtual labs** can teach setup decisions, variable control, prediction, data interpretation and repeatable experimentation, especially before or after a real practical. Label these as simulated practice and record them separately from completed physical practical work.
- **Offline support** should include downloadable instructions, blank results tables, graph paper/templates, apparatus diagrams, datasets for analysis practice and locally runnable simulations where feasible. Sync records and content updates when connectivity returns; core practice should not depend on a live AI call.
- **Teacher/school support** should allow practical activities to be assigned, observed or signed off where direct evidence is needed. A learner's self-reported completion must not be confused with teacher-verified practical performance.

#### Product and data requirements

Practical training must be represented in the content model and learner experience, not hidden inside prose. Each practical/applied activity should carry, as applicable:
- board, qualification, level, subject, syllabus code and examination-year version;
- topic/subtopic and assessment component/objective;
- competency and observable success criteria;
- activity mode: physical, low-cost physical, simulated, data-analysis or teacher-observed;
- prerequisites, apparatus/materials, setup, procedure and safety/supervision notes;
- variables, expected observations, data schema, units and recording template;
- graph/diagram/calculation requirements and analysis prompts;
- conclusion, uncertainty, evaluation and improvement prompts;
- feedback/marking rubric, accepted alternatives and common errors;
- evidence state: assigned, attempted, self-reported complete, teacher-observed, checked or verified;
- offline availability, content version, provenance and review history.

Track at least three distinct progress dimensions: **theory understanding**, **practical/applied skill**, and **assessment readiness**. Do not collapse them into one completion percentage. For Physics, record Paper 3 and Paper 5 readiness separately. For other subjects, derive the applied-skill categories from the actual syllabus rather than assuming they have Physics-style practical papers.

#### Release and quality gates

A subject-level-syllabus version cannot be labelled comprehensive until its practical/applied requirements have been inventoried and each requirement has an appropriate learning experience, assessment rehearsal, feedback method and evidence status. For 9702, verify the Paper 3 and Paper 5 skill map independently against the complete official syllabus before marking the practical component covered. Automated tests may validate calculations, content structure and offline behavior, but they do not replace a qualified subject teacher's review of procedures, safety, assessment alignment and practical rubrics.

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

### Chemistry 9701 practical-skills mapping (pilot stage)

The [9701 practical-skills register](./cambridge-9701-2025-2027-practical-skills.csv) tracks the current Chemistry 9701 (2025–2027) practical pilots against Paper 3 and Paper 5 skill areas. It records which areas have an initial authored lesson, which remain unbuilt, and which still require line-by-line confirmation against the official syllabus. It is deliberately **not** marked as an exhaustive or syllabus-verified practical inventory.

The exact [official 9701 syllabus PDF for 2025–2027](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf) is the controlling source. Its practical assessment section (PDF pages 58–73) distinguishes Paper 3 Advanced Practical Skills from Paper 5 Planning, Analysis and Evaluation. Paper 3 includes an observational problem using unknown substances, with qualitative-analysis notes supplied in the examination paper, and quantitative work involving a titration or measurement such as time, temperature, mass or gas volume. It expects suitable presentation of data/observations, analysis, calculations, conclusions and, where asked, comments on accuracy, errors and changes. Paper 5 is written, assesses planning, analysis, conclusions and evaluation, and may require a structured investigation design, hypothesis, diagrams/flow charts/tables/equations, or analysis of supplied data. The syllabus recommends at least 20% of course time in practical work, excluding demonstrations, and explicitly warns that extensive supervised laboratory experience is necessary for Paper 5 preparation.

Current authored pilots:
- **Quantitative analysis/titration:** [chemistry-practical-titration.ts](../../src/lib/cortex/curatedContent/chemistry-practical-titration.ts) covers volumetric apparatus, titre technique, concordance, mole/concentration calculations, uncertainty prompts and common procedural errors.
- **Qualitative analysis:** [chemistry-practical-qualitative.ts](../../src/lib/cortex/curatedContent/chemistry-practical-qualitative.ts) introduces systematic cation, anion and gas testing, observations versus inferences, confirmatory evidence and safety cautions.
- **Paper 5 planning and evaluation:** [chemistry-practical-planning.ts](../../src/lib/cortex/curatedContent/chemistry-practical-planning.ts) teaches problem definition, variables, hypotheses, apparatus/method design, data planning, safety, analysis, conclusions and evaluation using an original reaction-rate example.

These are original teaching pilots, not copied Cambridge material. The qualitative test coverage is not a replacement for the complete official test table. The planning module is a preparation framework, not an official mark scheme or a guarantee of complete Paper 5 coverage. A lesson, a simulation or a worked dataset does not establish hands-on laboratory competence. Before calling 9701 practical coverage complete, map every applicable official skill and test, review reagent hazards and disposal, check calculations and accepted observations independently, and validate the learning activities against the exact 2025–2027 syllabus. Keep the 2028–2030 syllabus separate.


## Biology 9700 practical pilot: microscopy and specimen observations

Syllabus version: Cambridge International AS & A Level Biology 9700, 2025-2027, Version 1 (published September 2022). Keep this distinct from 2028-2030.

Official syllabus: https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf
Official qualification page: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-biology-9700/

Paper 3 is a timetabled laboratory practical. It assesses manipulation, measurement and observation; presentation of data and observations; and analysis, conclusions and evaluation. Candidates may prepare slides, use a light microscope, observe specimens, present observations, analyse data and make deductions or conclusions. Paper 5 is a written planning, analysis and evaluation examination, but candidates still need extensive supervised laboratory experience. The syllabus recommends at least 20% of course time doing practical work individually or in small groups. Demonstrations and simulations do not count towards that recommendation.

Original module: src/lib/cortex/curatedContent/biology-practical-microscopy.ts
Fallback aliases: microscopy, microscope, biological drawings and specimen observation.
Test: src/lib/cortex/curatedContent/biology-practical-microscopy.test.ts
Register: docs/curriculum/cambridge-9700-2025-2027-practical-skills.csv

The module covers slide preparation, safe focusing sequence, total magnification, actual-size calculations and unit conversion, observation versus inference, biological drawings, representative sampling and evidence recording. It is an introductory skill module, not a complete Paper 3 syllabus map. Register rows remain pending line-by-line verification and content review. Digital lessons and simulations cannot certify microscope handling or replace supervised work with real specimens and equipment.


### Biology Paper 5 planning pilot

Original module: src/lib/cortex/curatedContent/biology-practical-planning.ts
Test: src/lib/cortex/curatedContent/biology-practical-planning.test.ts
Fallback aliases: experimental planning, planning and evaluation, Paper 5, and planning analysis and evaluation.

The lesson teaches problem definition, independent/dependent/control variables, hypotheses, repeatable methods, sampling and replication, table design, graphs, calculations and statistics, evidence-based conclusions, and evaluation. The worked contexts are original teaching examples, not prescribed Cambridge practicals. The Paper 5 register rows now point to this starter but remain pending detailed line-by-line syllabus verification and independent content review. This written lesson does not replace supervised practical laboratory work.


### Biology 9700 theory pilot: cell structure

Original module: src/lib/cortex/curatedContent/biology-cell-structure.ts
Test: src/lib/cortex/curatedContent/biology-cell-structure.test.ts
Runtime fallback aliases: cell structure, cells, prokaryotic and eukaryotic cells, and organelles.

The starter introduces prokaryotic and eukaryotic cells; organelle structure and function; plant, animal and bacterial cell comparisons; cell specialisation and differentiation; microscopy magnification and resolution; and original worked calculations and practice. This is a first Topic 1 teaching pilot, not complete Biology 9700 topic coverage. Full topic/subtopic mapping, assessment mapping, diagrams, independent review and offline content packaging remain outstanding.


### Biology 9700 theory pilot: biological molecules

Original module: src/lib/cortex/curatedContent/biology-biological-molecules.ts
Test: src/lib/cortex/curatedContent/biology-biological-molecules.test.ts
Runtime fallback aliases: biological molecules, carbohydrates, lipids, proteins and water.

The module covers water properties, condensation and hydrolysis, monosaccharides, disaccharides and polysaccharides, triglycerides, saturated and unsaturated fatty acids, phospholipids, amino acids and protein structure, biological molecule food tests, original worked comparisons and practice. It is a Topic 2 starter, not a complete topic/subtopic inventory. Full syllabus mapping, independently checked detail, visual teaching assets, review and offline content packaging remain outstanding.


### Biology 9700 theory pilot: enzymes (Topic 3)

Original module: `src/lib/cortex/curatedContent/biology-enzymes.ts`
Test: `src/lib/cortex/curatedContent/biology-enzymes.test.ts`
Runtime fallback aliases: enzymes, enzyme action and enzyme activity.

The starter covers biological catalysis, active sites and the induced-fit model, activation energy, effects of temperature and pH, substrate and enzyme concentration, denaturation, initial-rate interpretation and controlled enzyme investigations. Worked data and practice prompts are original. This is a Topic 3 teaching starter, not a complete subtopic inventory or independently reviewed syllabus sign-off. Energy-profile and rate-curve visual assets, exact syllabus mapping, independent scientific review and offline pack integration remain outstanding.


### Biology 9700 theory pilot: cell membranes and transport (Topic 4)

Original module: `src/lib/cortex/curatedContent/biology-membranes-transport.ts`
Test: `src/lib/cortex/curatedContent/biology-membranes-transport.test.ts`
Runtime fallback aliases: cell membranes, membrane transport and transport across membranes.

The starter covers the fluid mosaic model, phospholipids, membrane proteins and cholesterol, simple and facilitated diffusion, osmosis and water potential, active transport, co-transport, endocytosis and exocytosis, and surface area-to-volume ratio. The examples and practice prompts are original. This is a Topic 4 teaching starter, not a complete subtopic inventory or independently reviewed syllabus sign-off. A proper labelled membrane diagram, transport visualisations, exact syllabus mapping, independent scientific review and offline pack integration remain outstanding.


### Biology 9700 theory pilot: the mitotic cell cycle (Topic 5)

Original module: `src/lib/cortex/curatedContent/biology-mitotic-cell-cycle.ts`
Test: `src/lib/cortex/curatedContent/biology-mitotic-cell-cycle.test.ts`
Runtime fallback aliases: mitotic cell cycle, mitosis and cell cycle.

The starter covers interphase (G1, S and G2), chromosome and sister-chromatid terminology, prophase, metaphase, anaphase, telophase, cytokinesis in plant and animal cells, the role of mitosis in growth and repair, and cell-cycle checkpoints. It includes original chromosome-number reasoning and practice prompts. This is a Topic 5 teaching starter, not a complete subtopic inventory or independently reviewed syllabus sign-off. A labelled mitosis diagram/animation, exact syllabus mapping, independent scientific review and offline pack integration remain outstanding.


## Biology 9700 Topic 6 teaching pilot: nucleic acids and protein synthesis

- Version scope: Cambridge International AS & A Level Biology 9700, 2025–2027 syllabus only. The 2028–2030 syllabus is a separate version and must be mapped independently.
- Original module: `src/lib/cortex/curatedContent/biology-nucleic-acids-protein-synthesis.ts`.
- Offline fallback aliases: nucleic acids, protein synthesis, DNA replication, transcription and translation.
- Test: `src/lib/cortex/curatedContent/biology-nucleic-acids-protein-synthesis.test.ts`.
- Teaching scope: nucleotide components and DNA/RNA differences; phosphodiester bonds; antiparallel complementary DNA strands; semi-conservative replication; transcription; mRNA codons; tRNA anticodons; ribosome and peptide-bond formation; polypeptide sequence and protein function.
- This is an original starter lesson, not a complete topic 6 syllabus inventory. Exact learning-outcome mapping, sequence/diagram assets, specialist review, assessment-question validation and downloadable-pack integration remain outstanding. Strand-direction examples and biological terminology require independent review before verified status.
- No textbook passages, diagrams, questions or answer keys have been copied.


## Biology 9700 Topic 7 teaching pilot: transport in plants

- Version scope: Cambridge International AS & A Level Biology 9700, 2025–2027 syllabus only. Do not mix with the separate 2028–2030 syllabus.
- Original module: `src/lib/cortex/curatedContent/biology-transport-in-plants.ts`.
- Offline fallback aliases: transport in plants, transpiration, xylem and phloem.
- Test: `src/lib/cortex/curatedContent/biology-transport-in-plants.test.ts`.
- Teaching scope: root hair uptake; osmosis and mineral-ion absorption; apoplast, symplast and endodermis/Casparian strip; xylem adaptation; cohesion-tension; transpiration and stomatal control; potometer interpretation and its limitations; phloem structure; sources, sinks and mass flow.
- This is an original teaching pilot, not a complete Topic 7 learning-outcome inventory. Detailed official syllabus mapping, labelled transport diagrams, practical data/graph tasks, specialist review and offline pack integration remain outstanding. Potometer and transport explanations require independent subject review.
- No textbook passages, diagrams, questions or answer keys have been copied.


### Biology 9700 Topic 8: transport in mammals (original teaching pilot)

- Module: `src/lib/cortex/curatedContent/biology-transport-in-mammals.ts`.
- Runtime aliases: `transport in mammals`, `mammalian circulation`, `the heart`, `blood vessels`, and `tissue fluid`, restricted to Biology requests.
- The original lesson introduces the double circulation, route of blood through chambers and valves, cardiac cycle and cardiac output, artery/vein/capillary adaptations, plasma and formed elements, red-cell and haemoglobin function, the oxygen dissociation curve and Bohr effect, tissue-fluid formation and lymph return.
- A labelled route-of-blood drawing task and comparison table are included as teaching prompts. The diagram prompt is not a rendered anatomical illustration; a properly labelled, accessible heart/circulation visual remains outstanding.
- Automated tests check core coverage, practice content, alias retrieval and subject isolation.
- Status: original teaching pilot, draft. It is not a complete line-by-line syllabus map or independent subject-expert verification. Confirm every subtopic and assessment demand against the exact Cambridge 9700 2025–2027 syllabus before upgrading status. Physical circulatory practicals, diagram assessment, independent review and versioned offline-pack integration remain outstanding.
- The lesson is authored independently. No textbook passages, diagrams, or past-paper questions are reproduced.


### Biology 9700 Topic 9: gas exchange (2025–2027 syllabus pilot)

- Official mapping authority: Cambridge International AS & A Level Biology 9700, Version 1, September 2022, for examinations 2025–2027. Topic 9 is an AS topic. Official source: https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf (section 9.1, PDF page 29).
- Scope follows the seven learning outcomes in section 9.1: human gas-exchange structures; distribution of cartilage, ciliated epithelium, goblet cells, alveolar squamous epithelium, smooth muscle and capillaries; recognition of these tissues in slides and micrographs; recognition of trachea, bronchi, bronchioles and alveoli; plan diagrams of transverse sections of trachea and bronchus; roles of ciliated cells, goblet cells and mucous glands; functions of cartilage, smooth muscle, elastic fibres and squamous epithelium; and diffusion between alveolar air and capillary blood.
- Module: `src/lib/cortex/curatedContent/biology-gas-exchange.ts`.
- Runtime aliases: `gas exchange`, `human gas exchange system`, `alveoli`, `trachea and bronchi`, and `gas exchange in humans`, restricted to Biology requests.
- Original lesson includes airway pathway, tissue distribution and function, mucociliary clearance, bronchiole smooth muscle, alveolar exchange adaptations, partial-pressure gradients, micrograph identification, and explicit plan-diagram drawing practice for trachea and bronchus transverse sections.
- Automated tests check the official subject strands, diagram/practice prompts, alias retrieval and subject isolation.
- Status: draft teaching pilot with section-level syllabus scope checked against the official 2025–2027 PDF. Detailed sub-outcome review, independent Biology teacher review, actual accessible labelled diagrams/micrograph practice, and offline pack integration remain outstanding. A text drawing prompt is not a rendered anatomical diagram.
- All explanations and questions are original; no protected syllabus illustrations, coursebook figures or examination questions are reproduced.

### Topic 8 review note

A second pass against section 8 of the same official syllabus identified additional required strands not present in the first mammalian transport draft. The Topic 8 module has now been extended to include arterioles and venules, monocytes and neutrophils, water's solvent action and high specific heat capacity, sinoatrial node, atrioventricular node and Purkyne tissue, carbonic anhydrase, haemoglobinic acid, carbaminohaemoglobin, plasma transport of carbon dioxide and the chloride shift. Regression tests now check these terms. The topic remains a draft pending detailed mapping and independent review.
