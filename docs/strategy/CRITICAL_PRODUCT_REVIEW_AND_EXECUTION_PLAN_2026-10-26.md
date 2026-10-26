# Shadecode Student: Critical Product Reality Check and Execution Priorities
**Date:** 2026-10-26  
**Status:** Working register, not a claim that listed outcomes are already shipped.

## Executive decision

The critique is substantially correct about the risks: thin content weakens the first-use experience; a learning loop has little value before it has trustworthy learning material and real attempts; offline claims need precise boundaries; a new Vercel-hosted product has a trust and distribution gap; and Zimbabwean pricing must be locally usable.

Do not delete every other module blindly. Freeze expansion of low-priority surfaces and make one end-to-end student journey genuinely excellent first:

> A Zimbabwean secondary learner can find a syllabus-matched question, attempt it, check a worked solution, understand the mistake, save the work, and continue offline.

Prioritize exam preparation with Maths and Combined Science plus one English/language pathway, based on verified curriculum coverage and available source material. Do not claim five years of papers or full subject coverage until the actual inventory proves it. Preserve the existing Cambridge audience and architecture, but prioritize the core journey over adding more product surfaces.

## 1. Content coverage: inventory before promises

**Risk:** A large subject selector can make the product look comprehensive while a learner opens a subject and finds few usable questions or lessons.

**Required actions**
- Build a truthful coverage matrix by board, syllabus code, syllabus version, topic/objective, year, paper/component, question, worked solution, mark-scheme evidence, diagrams/data, and review status.
- Show meaningful coverage states: Available, Partial, In review, and Not available yet.
- Never infer a real lesson or question from a topic name alone.
- Prioritize verified question-and-solution packs over generic AI-generated notes.
- Keep imported questions traceable to their source and copyright/permission status.
- Include graphs, diagrams, practical/data questions, command words, mark allocation and marking logic when part of the actual assessment.
- Label generated content as a supplement, not a substitute for verified past papers.
- Do not imply endorsement by ZIMSEC or Cambridge without authorization. Say “mapped to the published syllabus” only where the mapping was checked.

**Definition of done:** A learner selecting a supported syllabus sees exactly which topics and paper components have reviewed, usable content. Every claimed count is generated from real records.

## 2. First-session value: Cortex must not require a week of blind faith

**Risk:** If Cortex needs days of behavioural evidence before it feels useful, new learners experience an empty or generic product.

**Required actions**
- Give immediate value from the first session using a short diagnostic or chosen-topic question set.
- Explain recommendations with evidence: “You missed 3 of 5 questions on…” rather than unsupported claims that a learner is weak.
- Separate observed facts, estimates and low-confidence hypotheses in the UI and data.
- Do not present a click, time-on-page or lesson-open event as proof of understanding.
- Use attempts, correctness, reasoning/misconception signals and spaced rechecks as stronger evidence.
- Show “Not enough evidence yet” where appropriate.
- Let students correct the system's interpretation.
- Evaluate recommendations against later performance before making strong exam-readiness claims.

**Definition of done:** Every insight has a visible evidence trail and uncertainty handling; a first-time learner receives useful guidance without pretending the system already knows them.

## 3. Scope discipline: one complete journey before more surfaces

**Risk:** Multiple modules create breadth without depth and increase maintenance load.

**Execution rule**
- Continue fixing existing modules, but pause speculative feature expansion.
- Rank work by impact on the core journey: discover content, attempt it, receive a reliable explanation, save progress, revisit offline.
- Treat Projects, Careers, Campus and advanced Cortex features as secondary until the core journey has verified content, dependable recovery and measurable learner outcomes.
- Maintain a feature matrix of Working, Partial, Offline-capable, Needs review and Not built. A menu item must not imply full implementation.

## 4. Teacher / human fallback

**Risk:** A learner stuck on a difficult concept needs a route beyond repeated AI retries.

**Practical first version**
- Add a learner-controlled “I'm still stuck” escalation from a lesson or question.
- Let learners share a compact explanation request containing the question/source reference, their attempt, the exact step where they got stuck, and their preferred language.
- Support copy/share to WhatsApp or another messaging app; never silently send student work or personal data.
- Provide a teacher/tutor directory or school-managed referral only when a real, consenting contact is configured.
- Include privacy guidance and a way to remove personal identifiers before sharing.
- Until a verified tutor network exists, label this “Ask a teacher / share for help”, not “Teacher support available”.

**Definition of done:** A learner can prepare a useful help request quickly, control exactly what is shared, and is never shown fake teacher availability.

## 5. Offline: make the promise specific and testable

**Risk:** “Offline-first” sounds like full offline access when some operations still require the cloud.

**Required actions**
- Provide visible offline status and a last-sync timestamp.
- Make explicit downloads available for reviewed lessons and question packs.
- Store lesson content and progress locally; queue changes durably and retry safely.
- Never wipe local content after empty or failed remote responses.
- Mark cloud-only functions clearly; do not pretend cloud AI works without a connection.
- Test airplane mode, flaky connections, process death, storage pressure, app upgrades and account switching.
- Keep the website service worker disabled until safe caching rules and regression tests are ready.
- Publish a capability table stating what works offline on Web and Android separately.

**Definition of done:** An offline test protocol passes on a real low-cost Android device. Marketing language matches the tested feature list.

## 6. Trust, brand and distribution

**Risk:** Ambiguous naming and a Vercel URL make discovery and credibility harder.

**Required actions**
- Use Shadecode Student consistently in the product title, app metadata, landing page, documentation and social profiles; describe Shadecode as the parent brand.
- Choose a stable domain only after checking availability, cost and renewal budget. Do not pretend a domain is owned before registration.
- Design a recognizable folded-S brand mark and ensure it renders consistently across favicon, PWA, Android launcher and in-app header.
- Publish plain-language privacy, retention/deletion, AI limitations, content sourcing, safeguarding and contact information.
- State that Shadecode is independent and not endorsed by ZIMSEC or Cambridge unless formal authorization exists.
- Pursue real pilot teachers/schools and collect consented feedback before claiming partnerships or testimonials.
- Prepare Play Store requirements and release hygiene, but do not imply a store listing exists until published.
- Avoid unverified claims about local hosting, zero-rating or network performance.

## 7. Pricing for Zimbabwe

**Risk:** “Free to start” without clear terms creates suspicion and can lead to a pricing shock.

**Required actions**
- Publish a simple pricing statement before monetization: what is free, what may become paid, and how existing student work is protected.
- Keep core access usable for learners with limited money and data.
- Test school-sponsored bundles, term-based access and low-cost subject packs with real families/schools before setting prices.
- Evaluate EcoCash and other local payment options only after confirming eligibility, fees, settlement and support requirements.
- Do not assume USD subscriptions or card-only checkout fit the market.
- Do not charge for access to a student's own saved work or hold learning records hostage after a trial.
- Do not announce a price before unit economics and provider costs are understood.

## 8. Content, human help and offline are one coherent product

The student needs a dependable recovery path:
1. Find a verified question or lesson.
2. Attempt it.
3. See a source-grounded explanation.
4. If still stuck, share a controlled help request with a human.
5. Save the attempt and explanation locally.
6. Continue without a connection and sync later.
7. Use the resulting evidence to guide the next practice session.

## Immediate order of work

**P0: Reliability and honesty**
- Keep fixing Android build failures until CI passes and an installable debug APK is produced.
- Preserve cached profile/content on empty network responses.
- Audit offline behaviour instead of relying on architecture descriptions.

**P1: Evidence-backed content**
- Finish the production inventory of usable lessons and question banks by board and subject.
- Choose the initial exam-preparation wedge based on verified material, not aspirational coverage.
- Make coverage and missing-content states visible.

**P2: First-session value and human escalation**
- Add a diagnostic/selected-topic starting path.
- Add evidence explanations and uncertainty labels to Cortex.
- Add a safe, learner-controlled share-for-help flow.

**P3: Trust and distribution**
- Align naming, brand assets, privacy/content provenance and store-readiness checklist.
- Investigate a stable domain and pilot partnerships without claiming uncompleted work.

**P4: Sustainable local pricing**
- Publish a transparent free-core promise.
- Test local payment and school-bundle hypotheses before implementing a paywall.

## Metrics that matter

Track privacy-minimizing aggregate measures:
- Percentage of new learners reaching a first meaningful attempt.
- Percentage viewing a verified explanation after an attempt.
- Successful lesson opens in airplane mode after download.
- Local progress changes recovered and synced after reconnect.
- Content coverage by syllabus objective and paper component.
- Error rate and answer/explanation correction rate.
- Recommendation calibration against subsequent performance.
- Learner-reported “I understand why I got this wrong.”
- Cost per completed learning session, not merely per AI request.
- Repeat study sessions and voluntary return rate.

Avoid collecting sensitive student data unnecessarily. Do not sell student data.

## Public response to the critique

A fair answer is: Shadecode Student is early, and some weaknesses are real. It should not claim full offline support, comprehensive past-paper coverage, a verified teacher network, official endorsement, or mature Cortex intelligence until each is demonstrated. The strongest next move is to make a narrow, useful exam-preparation journey reliable for students with limited data, then expand based on evidence.

## Related implementation register

- Offline and native roadmap: docs/architecture/OFFLINE_FIRST_NATIVE_ROADMAP_2026-10-26.md
- Published learning asset editorial workflow and coverage baseline: see adjacent architecture documentation.
- This document is a prioritized work register; items remain incomplete until verified by code, test, data inventory or real learner feedback.
