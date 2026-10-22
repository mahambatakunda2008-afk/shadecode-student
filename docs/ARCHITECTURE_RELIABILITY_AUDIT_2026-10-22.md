# Shadecode Architecture & Reliability Audit

**Checkpoint:** 2026-10-22  
**Status:** Initial source-of-truth review; implementation verification still required  
**Scope:** Shadecode Student, Cortex, canonical learning evidence, curriculum/mastery, offline reliability, and progressive product integration.

## Purpose

Convert the Shadecode ecosystem direction into an engineering sequence that improves reliability before adding more intelligence. This document distinguishes repository-documented architecture from behaviour that still needs source-code, database, test, and browser verification.

## Source documents reviewed

- `docs/MASTER_SHADECODE_ROADMAP_2026-09-01.md`
- `docs/PROJECT_STATUS_2026-08-29.md`
- `docs/CAPABILITY_REGISTRY.md`
- `docs/cortex-os.md`
- `docs/STRATEGY_CORTEX_NOVA.md`
- `README.md`
- `package.json`

These documents are useful architecture evidence, but they are not proof that every documented capability currently works in production. A source-code audit, live database inspection, test run, and browser verification are still required before upgrading any status.

## Current architecture baseline documented by the repository

1. **Canonical event spine:** product action → canonical normalization → authenticated persistence in `public.cortex_events` → observation/mastery state → intervention → measured outcome.
2. **Mastery storage:** the existing `topic_mastery` store remains authoritative. Do not create a parallel mastery table or a second mastery-scoring algorithm.
3. **Deterministic learning state:** a richer reducer and shared score transition are documented. Durable projection, idempotency at consumer boundaries, and coverage across evidence producers remain verification priorities.
4. **Offline queue:** account-scoped queued events and reconnect flushing are documented. Offline resume, replay, revision conflicts, and cross-device reconciliation need end-to-end evidence.
5. **Product maturity:** Learn is partial; Exam Simulation is marked for reliability work; Discovery's first activity needs end-to-end verification; Campus is a foundation rather than a finished product.
6. **Model routing:** provider routing exists, but local/cloud routing policy and local-model claims must remain evidence-driven.
7. **Test commands:** `npm run verify` runs typecheck, lint, and unit tests; `npm run build` and the existing Playwright commands provide further gates. No test result is asserted by this document.

## Non-negotiable engineering rules

- Reuse existing canonical events, observation adapters, shared mastery transitions, and `topic_mastery`.
- Never infer mastery from lesson views, aggregate-only completions, or activity volume alone.
- Treat missing evidence as **insufficient evidence**, not as low mastery or zero mastery.
- Keep curriculum truth separate from a learner's observed state.
- Make evidence consumers idempotent; replaying the same canonical event must not inflate mastery.
- Keep core scoring, prerequisites, scheduling, and state transitions deterministic where possible.
- Preserve offline progress and show clear pending/synced/failed states.
- Do not claim a capability is shipped until source, tests, and end-to-end behaviour support the claim.
- Keep subject visibility and access aligned with the learner's enrolled/selected subjects and authorized curriculum context.
- Update the capability registry and master roadmap when a capability's implementation or release state materially changes.

## Existing Syllabus Mastery Heatmap: reconciliation and hardening

A first read-only Syllabus Mastery Heatmap already exists on `main` from merged PR #370. That implementation reads verified curriculum objectives and `learner_curriculum_objective_progress`. The canonical event audit in this document separately traces the `topic_mastery` compatibility projection. These are not automatically interchangeable sources. Do not build a duplicate heatmap or claim the existing UI is powered by `topic_mastery` without verifying its current source path.

The next slice is reconciliation and hardening: inspect the merged implementation, confirm the intended relationship between objective progress and topic mastery, and preserve explicit insufficient-evidence states. Only bridge the sources if stable, verified objective-to-topic mapping and authorized read paths support it.

### Required state distinctions

Every syllabus topic shown to a learner must resolve to one of these display states:

- **Insufficient evidence:** no eligible, topic-linked learning evidence is available.
- **Developing:** eligible evidence exists, but the current mastery projection is below the configured proficiency threshold.
- **Secure:** eligible evidence meets the configured proficiency threshold and minimum evidence requirements.
- **Needs review / stale evidence:** evidence exists but is old enough to warrant a refresh, only when a documented and tested staleness rule exists.
- **Unavailable / not in this curriculum:** the topic is not part of the learner's active syllabus or cannot be mapped reliably. Do not silently substitute another syllabus.

The UI must not render a topic with no evidence as 0% mastery. If the current data contract cannot support one of these distinctions reliably, the UI should say so rather than inventing a score.

### Data and calculation contract

1. Obtain the active subject and syllabus from the existing learner/curriculum context.
2. Inspect the current heatmap's verified syllabus objective catalogue and `learner_curriculum_objective_progress` source, then compare with `topic_mastery` through existing authorized data paths. Do not silently replace one source with the other.
3. Use the existing shared mastery semantics; do not calculate a competing score in the component.
4. Join by stable topic identifiers, not display labels or case-insensitive text guesses.
5. Treat unmapped evidence as unmapped. Do not attach it to a similarly named topic.
6. Separate evidence count/recency from mastery score so users can understand why a state was assigned.
7. Keep the heatmap read-only. It must not create mastery records or mutate learning state merely because it was viewed.
8. Enforce server-side authorization and subject/curriculum scope. Client filtering alone is not an access-control boundary.

### Minimum tests before release

- Topic with no evidence renders **Insufficient evidence**, not 0% mastery.
- Topic with eligible evidence uses the existing authoritative mastery value.
- Duplicate/replayed event evidence does not inflate mastery.
- Evidence mapped to one syllabus cannot leak into another syllabus or subject.
- Topics outside the active curriculum are not shown as available syllabus topics.
- A missing or failed mastery query produces an explicit recoverable state, not fabricated defaults.
- The UI remains usable for a large syllabus and on narrow/mobile screens.
- Existing Learn, Exam Simulation, and offline queue behaviour does not regress.

### Acceptance gate

Do not mark the heatmap shipped until the source integration, unit tests, typecheck/lint, production build, authorized-user browser check, and no-evidence/replay scenarios pass. Record which checks actually ran and their outcomes.

## Audit execution order

### A. Evidence and mastery integrity
- Trace canonical event ingress through normalization, durable persistence, observation adapters, and each mastery consumer.
- Verify which event types are mastery-bearing versus analytics-only.
- Verify evidence identity and replay/idempotency at every consumer boundary.
- Confirm the single authoritative mastery transition and the treatment of the initial placeholder state.

### B. Curriculum integrity and heatmap
- Trace subject selection, active syllabus, stable topic IDs, topic access rules, and mastery reads.
- Audit the merged heatmap as a read-only projection over existing contracts; only reconcile objective progress with `topic_mastery` when the mapping and product semantics are verified.
- Add explicit insufficient-evidence and recoverable-error states.

### C. Offline and sync reliability
- Trace queue persistence, active-account ownership, reconnect flushing, revisions, conflict handling, and retry bounds.
- Verify offline resume and reconnect behaviour in a browser, including duplicate replay and sign-out/account-switch boundaries.

### D. Existing learning workflows
- Verify Learn generation completion, saved lesson durability, and recoverability after interrupted requests.
- Verify Exam Simulation start → answer → submit → result → canonical evidence → mastery projection.
- Verify Discovery's My Day → activity → attempt → feedback → event → mastery → next-activity loop.

### E. Documentation and release truth
- Update `docs/CAPABILITY_REGISTRY.md` and the master roadmap in the same engineering workstream as implementation changes.
- Record exact commands, results, deployment identifiers, and browser evidence.
- Never describe a documentation-only change as a product implementation.

## Initial finding and limitation

The reviewed documents consistently identify the canonical evidence spine, mastery reconciliation, offline verification, and Exam Simulation reliability as the highest-value dependencies. They also describe several capabilities as foundations or in progress.

At this checkpoint, the canonical event/mastery implementation has been inspected and the existing heatmap's merged PR description has been reviewed. The current heatmap source path, live database state, CI results for this branch, and production browser flows still require direct verification. Accordingly, no new capability is upgraded to shipped status here.

## Next engineering action

Inspect the canonical event bridge, observation adapter, mastery reducer/consumer, and the already-merged heatmap's data path. Add a regression test for legacy mastery rows, then verify subject-scoped reads, objective/topic mapping, empty-data behaviour, and CI without introducing duplicate state or changing unrelated access behaviour.our.


## Source-level trace performed after the initial checkpoint

The following source files were inspected on the default branch before applying the proposed compatibility fix:

- `src/app/api/intelligence/events/route.ts`
- `src/lib/intelligence/learningEvents.ts`
- `src/lib/intelligence/learningObservation.ts`
- `src/lib/cortex/learningState.ts`
- `src/lib/intelligence/masteryTransition.ts`
- `src/lib/intelligence/projectLearningEvent.ts`

### Confirmed from source

- Event ingress authenticates through Supabase server auth, normalizes a supported event, and persists through `insert_canonical_cortex_event`.
- The ingress attempts the mastery projection after persistence and returns HTTP 202 with `projectionPending` if projection throws. The event can therefore be durably accepted while the projection remains pending.
- The observation adapter ignores events without an explicit topic and excludes events marked `aggregateOnly`.
- The shared mastery transition uses a documented 70/30 historical/evidence EMA heuristic. The source explicitly says this is not a validated psychometric model.
- The projection uses a unique marker keyed from the canonical event ID to avoid processing the same event twice.
- The projection reads `attempts` and the richer `exposure` field from `topic_mastery`. Before the fix below, its state adapter defaulted a missing/zero exposure to zero even when an older row already had recorded attempts.

### Compatibility issue corrected in this branch

A legacy `topic_mastery` row can have a positive `attempts` count while `exposure` is absent or still zero. The reducer interprets `exposure === 0` as “no prior evidence” and sets mastery to the latest evidence score. That could overwrite the established mastery baseline instead of blending the new observation with prior history.

The branch now initializes the reducer's exposure from the stored attempt count when the richer exposure value is zero/missing. This is a narrow compatibility safeguard; it does not add a new table or scoring algorithm.

**Verification status:** the source change has been committed to this PR branch, but automated tests, typecheck, lint, build, database replay, and browser checks have not been run from this connector. Do not merge or call the fix verified until those gates pass. A focused regression test should cover a legacy row with `attempts > 0` and `exposure = 0/null`, asserting that the next observation uses the historical 70/30 transition rather than resetting mastery to the latest evidence.


## Product quality and market viability evaluation framework

The proposed external assessment gives Shadecode Student an **8.1/10** overall score. Treat this as a hypothesis-generating review, not an independently verified product rating. The score is not yet backed by a reproducible benchmark, audited production behaviour, representative student research, competitor testing, or validated learning outcomes. Do not use it as an objective claim in marketing, investor materials, or school pitches without supporting evidence.

### Separate the two evaluation lenses

**Product quality** asks whether the software reliably helps learners:
- Curriculum accuracy and syllabus coverage.
- Correctness of explanations, marking, and feedback.
- Quality of step-by-step diagnostics where the feature exists.
- Reliability of lesson generation, saving, and recovery.
- Offline behaviour and safe synchronization.
- Accessibility, usability, performance, and low-bandwidth resilience.
- Appropriate use of evidence in personalization.
- Privacy, security, and student-data protection.

**Market viability** asks whether the product can sustainably reach and retain users:
- Evidence of a frequent, important learner problem.
- Activation, successful first study session, retention, and referral.
- Willingness and ability to pay, including affordability in Zimbabwe.
- School buyer interest, procurement friction, and implementation costs.
- Distribution channels and cost to acquire active users.
- AI/model operating costs per successful learning outcome.
- Differentiation supported by measured product performance.
- Support burden, safeguarding, and institutional trust.

Do not combine these into one score until both have defined weights and evidence.

### Evidence standard for product comparisons

Comparisons with ChatGPT, Gemini, Quizlet, and past-paper PDFs must use the same representative tasks, curricula, devices, connectivity conditions, and scoring rubric. Avoid unsupported blanket claims such as “generic AI always gives final answers” or “Shadecode analyzes handwritten working” unless those specific capabilities have been verified end-to-end. Offline PDFs and flashcards are genuinely useful alternatives; comparisons should recognize their strengths as well as their limitations.

A capability statement must be tagged as one of:
- **Verified:** source and tests or observed end-to-end behaviour support it.
- **Partially verified:** some paths work, but important conditions or failure modes remain untested.
- **Planned:** described in strategy or design, not established as working software.
- **Unknown:** insufficient evidence to classify it.

Architecture documentation alone does not prove a feature is production-ready.

### Suggested weighted scorecard (proposed weights, not current ratings)

| Dimension | Weight | Evidence needed |
|---|---:|---|
| Curriculum accuracy and verified coverage | 20% | Syllabus-to-topic audit, sourced content, independent marking checks |
| Learning feedback and pedagogical quality | 15% | Blind evaluation of representative student attempts and feedback |
| Reliability and data integrity | 20% | Generation completion, save/recovery, replay and sync tests |
| Offline and low-bandwidth experience | 10% | Repeatable tests under offline, intermittent, and slow-network conditions |
| Usability and accessibility | 10% | Student task testing, completion rates, accessibility checks |
| Personalization quality | 10% | Evidence-to-intervention audit and measured follow-up performance |
| Privacy, safety, and trust | 5% | Permission/RLS review, data minimization, policy and safeguarding checks |
| Adoption and retention | 5% | Cohort-based activation and retention metrics |
| Sustainable economics and distribution | 5% | Cost per successful session, user acquisition evidence, buyer validation |
| **Total** | **100%** | |

Rate each dimension only after collecting evidence, and publish the score with its sample size, test date, conditions, and limitations. If evidence is missing, mark it **Not yet rated** rather than assigning a flattering or punitive guess. The weights should be reviewed with student and school feedback; they are a starting proposal, not a validated standard.

### Initial interpretation of the 8.1/10 claim

- **Useful strategic hypotheses:** local curriculum relevance, low-bandwidth needs, evidence-based adaptation, and school integration could differentiate Shadecode if implemented and validated.
- **Not yet established by the rating alone:** strong product-market fit, superior marking accuracy, full offline intelligence, robust handwriting diagnostics, a defensible moat, or school-scale readiness.
- **Current priority:** reliability and independently verifiable learning utility come before claiming a high rating or building the market narrative around it.

### Market validation sequence

1. Recruit a small, clearly described cohort of target learners and run observed study tasks.
2. Record successful activation, lesson completion, failure reasons, repeat use, and learner-reported usefulness.
3. Compare Shadecode with realistic alternatives on matched syllabus questions and connectivity constraints.
4. Interview school decision-makers about the actual workflow, procurement, privacy, teacher workload, and budget.
5. Measure model and infrastructure cost per successfully completed learning task.
6. Recalculate the scorecard from evidence, publishing unknowns and negative results as well as positive results.

A school-licensing or telecom partnership is a hypothesis to validate, not an assumed solution. Do not pursue zero-rating or institutional integrations until buyer interest, economics, operational capacity, and privacy requirements are better understood.


## Sustainable monetization and distribution strategy

### Strategic thesis

Do not make a recurring student subscription the only route to sustainability. In markets where household disposable income and access to online payments are constrained, individual monthly payments may create a barrier before the product has demonstrated enough value. Treat institutional licensing, sponsored cohorts, paid physical/teaching products, and optional telecom distribution as experiments to validate. Keep a useful core learning experience free while proving learning value and retention.

This is a strategic hypothesis, not evidence that any buyer, sponsor, or telecom operator has agreed to pay. No revenue, contract, zero-rating arrangement, or partnership should be described as secured until documented.

### Proposed model portfolio, ordered by validation priority

| Model | Primary payer | Potential offer | Why it may fit | Main risks / proof required |
|---|---|---|---|---|
| **1. School licensing (B2B)** | School or school network | Shadecode Student access plus selected SCS workflows, teacher-facing reporting, onboarding and support | One institutional buyer may fund access for a whole cohort; schools already coordinate learning and communication | Long sales cycle; school budgets and fee rules vary; implementation/support burden; privacy and consent; schools may not want bundled products. Validate with buyer interviews and a paid pilot before pricing at scale. |
| **2. Corporate/NGO-sponsored access** | Corporate CSR/ESG programme, foundation, NGO, donor | Sponsored seats for defined schools/cohorts, with anonymized and aggregated impact reporting | Can fund access for learners who cannot pay directly | Grant cycles and renewals are uncertain; reporting must be credible; sponsor influence and branding must not compromise teaching or student privacy. Do not sell identifiable student performance/recruitment data. |
| **3. Free core plus print and teaching add-ons** | Parents, students, schools | Print-ready revision packs, worksheets, teacher-reviewed past-paper packs, workshops or bootcamps | Families may value a tangible, clearly scoped product more than a generic app subscription | Printing, distribution, moderation and instructor time create real costs; exam-content licensing/copyright must be checked; digital access must not be deliberately crippled to force purchases. Pilot small batches and measure contribution margin. |
| **4. Telecom distribution / micro-bundles** | Telecom operator, student via approved billing, or both | Sponsored/discounted data, educational bundles, or airtime billing where the operator supports it | Could reduce data/payment friction and make discovery easier | Requires operator approval, commercial terms, technical integration, support, and regulatory review. Zero-rating is not something Shadecode can enable alone. Treat all price points and partner examples as illustrative, not negotiated offers. |
| **5. Optional individual payment** | Student/parent | Clearly optional premium services, where they add real value | Simple to test with a small segment and useful for learning willingness-to-pay | Should not be the sole sustainability plan or exclude learners from core practice; payment methods and affordability vary. |

The models can coexist. Start with the ones that can be tested without major engineering or capital expenditure. Do not build telecom billing or a full school enterprise suite before securing credible buyer interest.

### School + SCS bundling: boundaries before build

A bundle may be commercially compelling, but Shadecode Student and Shadecode SCS serve different users and handle different data. Keep permissions, roles, data retention, and product responsibilities explicit.

Before any pilot:
- Identify the actual buyer, school decision-maker, daily users, and the specific problem the school is paying to solve.
- Define which SCS functions are included and which Student features are included; do not promise a complete suite that has not been built and tested.
- Separate student learning records from communication/administrative records unless a documented purpose and permission justify a link.
- Use least-privilege access, school-scoped authorization, auditability, retention/deletion rules, and appropriate parent/learner notices and consent.
- Report learning trends at an appropriate aggregate level; do not expose private student conversations or turn uncertain mastery estimates into high-stakes decisions.
- Pilot with a small cohort, track teacher workload and student outcomes, and agree on support and exit/export procedures.

The suggested `$10–$15 per learner per year` is only a pricing hypothesis. Test it against real school budgets, what is already covered by ICT fees, willingness to pay, implementation cost, and the value actually delivered. Do not assume schools can or will add it to mandatory fees.

### Sponsored access: measurable impact without surveillance

Offer sponsors a defined, time-limited cohort and a transparent impact report: seats activated, study sessions completed, syllabus areas practised, completion/failure rates, and carefully designed learning checks where feasible. Publish definitions and limitations. Use aggregated/de-identified reporting by default, suppress small groups where re-identification is possible, and never promise direct access to identifiable learner scores, private activity, or a recruitment pipeline built from minors' data. Sponsor branding must be modest and must not influence curriculum, assessment, or student recommendations.

### Low-cost AI and infrastructure economics

The target is not literally “zero cost”; it is **predictable, low cost per successful learning task**, with no paid API required for basic offline functionality. Follow the existing offline-cost policy:
- Prefer deterministic local tools for calculations, checking, structured workflows, and known syllabus content when they can do the job reliably.
- Cache versioned, reusable explanations and common curriculum resources where licensing permits; do not treat different student contexts as identical merely because prompts look similar.
- Route only tasks that need generative reasoning to a model; set timeouts, bounded retries, budgets, and a deterministic recovery path.
- Make offline progress durable and sync idempotent when connectivity returns; never imply a cloud-only operation has succeeded while it is pending.
- Evaluate smaller open-weight models on representative syllabus tasks for correctness, latency, memory use, hardware requirements, redistribution licence, and total hosting cost before selecting or fine-tuning one.
- Do not promise that an open-source model or a regional VPS is free. Hardware, hosting, monitoring, updates, safety evaluation, and support all cost money.
- Measure cost per successful completed lesson/check/session, not only cost per API request. Include failed generations and retries.

### Phased validation plan

**Phase A: near-zero-cost discovery**
1. Interview 8–12 school decision-makers across different school types, without treating this small sample as representative.
2. Ask about current communication/reporting pain, existing ICT allocations, purchasing authority, approval cycles, student device/connectivity constraints, and budget ranges.
3. Show a concise demo of working features only. Record objections and what a buyer would need to see before paying.
4. Offer a narrowly scoped pilot with clear boundaries; seek a real budget signal rather than relying only on compliments.

**Phase B: prove utility and delivery**
1. Run a small learner cohort and measure activation, successful study tasks, completion failures, repeat use, and learning checks.
2. Record teacher setup/support time and the full cost of delivering the pilot.
3. Test one paid print/workshop offer with actual pre-orders or purchases before investing in inventory.
4. Draft one sponsor proposal using defensible metrics and privacy-safe reporting.

**Phase C: economics and scale gate**
- Calculate annual cost per active learner and cost per successful learning task, including support, hosting, model use, payments, printing, and onboarding.
- Calculate school contribution margin at several tested price points; distinguish revenue from cash actually collected.
- Proceed to a larger rollout only if there is evidence of continued use, a credible payer, acceptable privacy/safeguarding controls, and sustainable delivery cost.
- Pursue telecom integration only after an operator or aggregator confirms a feasible route, commercial terms, and technical requirements.

### Decision rule

The near-term priority is **prove that learners reliably benefit, then prove who will pay for that benefit**. The likely starting portfolio is free core student access + a small school/SCS discovery pilot + a tightly scoped print/workshop experiment. Sponsored access is a parallel funding path. Telecom micro-bundling remains a later partnership-dependent option. Optional B2C payments can be tested, but must not be assumed to carry the business alone.
