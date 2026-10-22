# Shadecode Student — Master Execution Plan
**Date:** 2026-10-22  
**Status:** Strategic execution plan; implementation status must be verified against source, tests, and production.

> This plan extends the existing master roadmap. It does not replace it or authorize a rewrite. Existing code, verified production behaviour, and established architecture remain the sources of truth.

## 1. Product north star

**Help every learner make a better next learning decision, regardless of school, location, or connectivity.**

Shadecode Student is the current secondary/exam-focused learning experience in the wider Shadecode platform. It should not be reduced to a generic chatbot or a basic school administration portal.

The core loop is: **Observe → Understand → Recommend → Practise → Evaluate → Adapt → Remember.** Lessons, attempts, mistakes, exam outcomes, projects, revision, and feedback should become reliable evidence that improves the learner's next action. Do not claim learning improvement or mastery without evidence.

## 2. Strategic product layers

1. **Learning OS (current centre):** curriculum-aware learning, assessment, revision, Cortex insights, learner state, and offline capability.
2. **School OS (validated expansion):** teacher, parent, communication, attendance, results, assignments, and administration workflows where schools confirm the need.
3. **Education Network (later expansion):** study communities, mentors, scholarships, careers, tertiary discovery, and trusted educational partners.

These are connected directions, not a mandate to build three products at once. Strengthen the existing Learning OS first. Validate school and network features with real users before committing to them.

## 3. Non-negotiable principles

- Build on the existing Next.js, TypeScript, Supabase, Vercel, and Cortex foundations; do not replace working architecture without evidence.
- **AI is not just an API call.** Cortex should coordinate memory, deterministic tools, curriculum retrieval, local capability, cloud providers, reliability, and actual learning workflows.
- Keep deterministic calculations, authorization, mastery rules, and canonical learning state outside the authority of generative models.
- Never fabricate curriculum coverage, marks, mastery, citations, project evidence, or product capabilities.
- Protect student data. Enforce access in server-side authorization and database RLS; hiding UI elements is not security.
- Design for unreliable connectivity and constrained devices. Offline functionality must be tested, not merely advertised.
- Prefer reversible, observable changes. Avoid broad rewrites and unrelated feature work in one change.
- A task is not complete because code was generated. It is complete only when acceptance criteria are verified and release status is accurately recorded.

## 4. Execution order

### P0 — Establish product truth and remove critical failures
**Goal:** A learner can complete core workflows reliably.

1. Read the current master roadmap, capability registry, task tracker, project status, and relevant architecture documents before changing code.
2. Audit Learn and lesson generation end-to-end: request, generation, save/finalization, recovery, retry, duplicate prevention, and user-visible completion.
3. Audit Exam Simulation end-to-end: start, timer, answer persistence, submission, marking, results, and evidence integration.
4. Audit Math Checker and other high-use assessment workflows for correctness and clear failure states.
5. Verify authentication, session handling, authorization, RLS, subject access, and sensitive school/student data boundaries.
6. Check recent production deployments and runtime errors. Do not assume repository HEAD equals production.
7. Reproduce failures with targeted automated tests and browser verification; fix root causes before adding features.

**Acceptance criteria:** no known critical failure is marked fixed without a reproduction test or documented verification; retries do not silently duplicate or lose work; users receive honest, actionable status and recovery options.

### P1 — Make the learning loop coherent
**Goal:** Shadecode uses evidence to improve what the learner should do next.

1. Map the actual learner journey across lessons, practice, exams, mistakes, revision, and Cortex recommendations.
2. Verify canonical event identity, persistence, replay/idempotency, offline queue ownership, and conflict handling.
3. Reconcile learning state with the established topic_mastery store and current reducer semantics; do not introduce a competing source of truth.
4. Improve recommendations only where reliable evidence supports them.
5. Connect a learner's demonstrated weakness to targeted practice, then check whether the weakness improves.
6. Ensure generated content is curriculum-aware, useful, age-appropriate, and clear about uncertainty.
7. Keep local-first/offline behaviour and sync semantics explicit.

**Acceptance criteria:** key learning actions create trustworthy evidence; replay does not double-count; recommendations can be traced to real evidence; generated material is not presented as official curriculum content unless verified.

### P1 — Trustworthy product feedback and measurement
**Goal:** Learn from real usage rather than founder assumptions.

Track, with privacy minimization: first meaningful learning action completed; successful lesson and exam completion rates; week-one return rate and ongoing retention; failure rates by workflow and recovery outcome; use of core features; reported issues and time to resolution; AI/provider cost per completed workflow and per active learner; and learning outcomes only where measurement is valid and ethically collected.

Use aggregated reporting wherever possible. Do not sell personal student data or expose individual learning histories to advertisers, sponsors, or other schools. Avoid collecting sensitive information that is not required for the product.

### P2 — Adoption experiments
Run two complementary experiments rather than assuming one channel will win.

**Student-led path:** recruit a small group studying supported curricula; observe real tasks, not just opinions; identify one high-value recurring workflow; make onboarding and sharing easier without spam or coercion; ask for honest feedback and permission before using testimonials.

**School-led path:** interview schools about one concrete workflow, such as announcements, assignments, or progress communication; do not build a full school management suite before confirming the problem and buyer; pilot the smallest safe workflow with explicit school permission and access controls; measure time saved, reliability, adoption, and support burden. A pilot is validation, not proof of broad demand.

### P3 — Expand deliberately
Possible expansion order, subject to evidence: improve curriculum and assessment coverage; strengthen revision and next-best-action workflows; add teacher-created content and safe collaborative learning; pilot school communication/administration modules if requested by real schools; develop tertiary/Campus workflows where learners validate the need; explore scholarship, mentorship, and careers connections through verified partners.

Each new capability needs an owner, user problem, dependency map, privacy/safety review, acceptance criteria, and rollback path.

## 5. Architecture and provider policy

- Keep frontend AI calls routed through the established Cortex/server-side gateway.
- Select providers by task quality, latency, availability, privacy/terms, and measured cost, not provider count.
- Use deterministic code for deterministic tasks; use retrieval/cache for repeated curriculum questions when safe and correct.
- Fallbacks need explicit timeouts, bounded retries, error classification, and observability. A fallback is not guaranteed to be available or free.
- Do not send personal learner data to another provider unless data flows, provider terms, and safeguards have been reviewed.
- Add Cloudflare, Firebase, or other services only when a specific requirement justifies the extra operational surface.
- Keep API keys server-side and never commit secrets.
- Review current provider quotas and terms before making capacity promises. Free-tier limits can change.

## 6. Sustainable support and monetization

### Principle
**Keep the essential learning experience accessible. Invite voluntary support without making learners feel guilty or locking basic education behind payment.**

Add an optional **Support Shadecode** entry point when a safe, usable payment route is ready. This is a contribution request, not a subscription and not a requirement to use the product.

### First version: simple, transparent support

Explain what Shadecode is trying to make possible; that contributions are voluntary; what support may help fund (hosting, AI usage, connectivity-resilient development, and maintenance); that not contributing does not reduce academic standing or access to essential learning features; and whether a contribution is one-time or recurring, including any fees or currency conversion.

Offer a small set of optional contribution amounts plus a custom amount, but do not choose final amounts until payment rails, fees, and local affordability have been checked. Show a clear confirmation and provide a contact path for payment issues.

### Payment implementation gate

Before publishing a payment button:
1. Confirm which receiving accounts and payment providers the project can lawfully and practically use in Zimbabwe and target countries.
2. Verify current merchant eligibility, supported currencies, withdrawal/settlement rules, transaction fees, refunds, and account ownership requirements from official provider documentation.
3. Select the simplest dependable route. Depending on verified eligibility, this may be a hosted payment page, supported mobile-money/business payment method, bank transfer instructions, or a donation platform.
4. Never publish personal account details without an explicit owner decision and appropriate safeguards.
5. Never collect or store card details directly. Use a reputable hosted checkout/provider if card payments are supported.
6. If contributions are tracked in the app, verify payment server-side using provider webhooks or signed confirmation. Do not trust a browser redirect or user-uploaded screenshot as proof of payment.
7. Keep secrets server-side, prevent duplicate processing, log only necessary transaction metadata, and provide a refund/support policy.
8. Review tax, fundraising, consumer-protection, data-protection, and charity representations before claiming contributions are tax-deductible or presenting Shadecode as a registered charity.

If no verified online processor is practical, launch a transparent Support page with a verified direct-transfer option and clear manual confirmation instructions. Do not invent or assume a payment integration is available.

### Future funding options, not current commitments

- Voluntary one-time contributions and recurring supporter contributions.
- School or institutional partnerships.
- Sponsored access to learning tools or competitions.
- Education-focused grants and NGO partnerships.
- Teacher productivity tools or institutional licensing.
- Carefully vetted educational partners and opportunities.

Advertising, rewarded ads, marketplaces, and paid AI add-ons are later experiments, not prerequisites. Do not use targeted advertising based on sensitive student data. Any future advertising or sponsored placement must be clearly labelled, age-appropriate, privacy-preserving, and never influence academic outcomes.

### Supporter recognition

Optional thank-you messages or cosmetic supporter badges may be offered if appropriate. They must not confer academic advantages, alter marks, improve leaderboard standing, or pressure children to pay. No public donor name or amount should appear without explicit consent.

### Support metrics

Measure contribution conversion and retention only at an aggregate level. Report transparently what funds were used for where feasible. Never imply that a contribution guarantees a feature, result, or response time unless Shadecode can honour that promise.

## 7. UX and accessibility

- Improve the existing design rather than replacing it without evidence.
- Keep navigation understandable and task-focused.
- Use consistent, recognisable icons and labels; do not rely on ambiguous icons alone.
- Make loading, saving, completion, failure, and recovery states distinct.
- Support narrow screens, keyboard access, readable contrast, and low-bandwidth use.
- Avoid manipulative streaks, guilt-based support prompts, deceptive urgency, and interruption of learning with monetization.

## 8. Engineering completion and release gate

For each focused change: inspect the current implementation and related docs/tests; state the root cause or user problem; make the smallest coherent change; add/update regression tests; run relevant checks (npm run lint, npx tsc --noEmit, npm test, npm run build as applicable); browser-test critical flows and mobile layout when UI changes; review migrations and RLS separately; verify deployment readiness and actual production behaviour; update the master roadmap, capability registry, and relevant architecture docs; report what changed, evidence gathered, remaining risks, and exact verification status.

Do not merge or deploy merely to make a task appear complete. Keep changes focused and reversible.

## 9. Initial next actions

1. Read the current task tracker and project status to avoid duplicating completed work.
2. Inspect recent source changes and deployment status.
3. Prioritize the highest-impact active reliability issue in lesson generation or Exam Simulation based on current evidence.
4. Verify authentication/RLS and subject access in the same audit cycle, without mixing unrelated code changes into one patch.
5. Define baseline activation, completion, retention, and failure metrics.
6. Research and verify viable voluntary-support payment rails for the project's actual receiving-account eligibility before implementing checkout.
7. Only after those checks, build the smallest optional Support page/button and test the entire contribution confirmation flow.

## 10. Definition of success

The near-term goal is not the largest feature list or the highest registration count. It is a dependable product that learners return to because it helps them learn, with measurable outcomes, trustworthy data handling, a sustainable operating plan, and a clear path to school and institutional adoption.

**Build aggressively. Verify honestly. Keep learning accessible.**
