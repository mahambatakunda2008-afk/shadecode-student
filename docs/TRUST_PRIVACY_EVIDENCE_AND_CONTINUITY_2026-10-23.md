# Trust response: privacy, evidence and continuity

**Prepared:** 2026-10-23  
**Purpose:** Convert the recent external critique into verifiable product work. This is an internal engineering checklist, not a claim of legal compliance or an independent security audit.

## What the critique gets wrong, and what it gets right

The repository is a real Next.js application with Supabase-backed authentication/data flows, canonical learning-event ingestion, learning-state code and automated CI. It is therefore inaccurate to describe the whole product as only a Framer page with a prompt. However, repository existence and green CI do not prove every deployed workflow is reliable, that students obtain better outcomes, or that every feature shown in marketing is complete.

The privacy criticism identified a genuine issue: the previous `public/privacy.html` said no sensitive personal data was required and described only optional profile details and anonymous statistics. That was materially incomplete for a learning product that can process account identifiers, learning events, attempts, assessment results, user-provided content and AI prompts. The public policy has been rewritten to describe these categories, AI-provider processing, local/offline storage, third-party infrastructure, deletion requests and current retention limitations in plain language.

## Evidence-backed response to the major criticisms

| Criticism | Current response | What still needs proof |
|---|---|---|
| No privacy policy | A public privacy policy exists in `public/privacy.html`; it has been rewritten because the earlier version was too narrow. | Confirm the deployed route shows the new version; verify actual AI provider data-use settings and provider retention; establish an operational deletion workflow and retention schedule. |
| No data protections | The codebase has authenticated event ingestion, user-scoped persistence, RLS in relevant stores and security tests. | Run a scoped privacy/security review across all tables, uploads, logs, admin routes and provider configurations. Do not imply certification. |
| Just a Framer page / no real infrastructure | The repository contains a Next.js application, Supabase integration, Cortex code and CI. | Publicly demonstrate real flows, not architecture diagrams alone. Confirm each shown flow works in production. |
| Generic AI tutor pitch | The intended distinction is curriculum-aware workflow + source-attributed study evidence + next action + measured follow-up, not memory as a slogan. | Record a short real product walkthrough and compare it against a simple revision timetable, past-paper practice and a general chatbot. Keep only advantages that survive the comparison. |
| Roadmap distracts from product | Discovery and Campus are product directions, not proof of shipped capabilities. | Label available, foundation, in-progress and research items consistently. Keep the public CTA and roadmap centered on the current Student experience until it reliably serves its target learners. |
| “No AI” / AI is not the answer | AI is optional infrastructure for selected tasks; deterministic learning rules, past papers, planning, feedback and human teaching remain valuable. | Test whether Cortex-guided next actions improve completion, delayed recall or independent question performance versus ordinary revision planning. |
| Product could disappear | The repo and database are not a continuity guarantee by themselves. | Publish an export path, document backup/restore ownership and recovery procedures, and decide how learners retrieve their data if the service is discontinued. |

## Release gates

### P0: privacy truth and data control
- [ ] Confirm current production deployment serves the revised privacy policy.
- [ ] Verify the actual configured AI provider(s), data-use settings and retention terms. Do not infer these from the presence of an API key.
- [ ] Map the exact data categories sent to each provider; minimize prompt context and avoid sending account identifiers unless required.
- [ ] Implement and test a documented account/data deletion process, including relevant learning records and uploads, with a defined response target.
- [ ] Define a retention schedule for learning events, feedback, diagnostics and backups.
- [ ] Audit student data isolation across API routes, database RLS, storage buckets, admin tools and exports.

### P0: prove the core product
- [ ] Demonstrate sign-in, lesson generation, lesson completion, practice, progress persistence and recovery using a clean test account.
- [ ] Show a failure and recovery path honestly, including what is saved locally and what has reached the server.
- [ ] Make the current supported boards and subject coverage easy to verify. Do not imply a board is fully supported based only on a database record or objective count.
- [ ] Add a public, real product walkthrough with dated screenshots or a short recording from the deployed application. Do not fabricate learner results.

### P1: learner value evidence
- [ ] Recruit a small opt-in student pilot and publish the method, sample size and limitations.
- [ ] Compare a Cortex-guided next action with ordinary revision planning or a past-paper session.
- [ ] Measure task completion, independent performance on a fresh question and delayed recall where feasible.
- [ ] Publish results only after collecting them; no invented testimonials, reviews, retention or outcome claims.

### P1: continuity
- [ ] Give learners an understandable way to export their own study history and user-created content.
- [ ] Document backups, restoration owner, recovery test cadence and what is not currently backed up.
- [ ] Define a service-discontinuation plan: advance notice where feasible, export window, and a clear statement of what can and cannot be preserved.
- [ ] Keep repository access and deployment/database ownership recoverable; avoid a single-person undocumented recovery dependency.

## Communication rule

Respond to criticism with evidence and limits, not argument. A feature is “available” only when a learner can use it reliably; “foundation” means the underlying mechanism exists but the complete workflow is not proven; “in progress” means it is still being integrated; “research” is not a shipped capability. No claim of legal compliance, independent security certification or improved learning outcomes should be made without the corresponding evidence.
