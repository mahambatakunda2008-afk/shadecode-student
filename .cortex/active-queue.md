# Cortex Active Execution Queue

This is the executable queue for Cortex Engineering. `.cortex/tasks.md` remains the historical/strategic roadmap and audit trail.

## 🔴 Offline sync completion — ACTIVE
- Architecture audit and sync contract are complete.
- Durable IndexedDB mutation queue is active for `tasks`, `subjects` and `learn_lessons`.
- Authenticated synchronization, retry/backoff and account scoping are implemented.
- Pending/exhausted mutation status is now visible in the learner UI.
- Next: server-side idempotency for high-consequence mutations and entity-specific revision/conflict semantics.
- Do not allow XP, achievements, exam answers or Cortex evidence into the generic queue until their server semantics are explicit.

## 🔴 Security audit completion — P0 baseline verified
- P0 auth/RLS/API/service-role/Cortex/offline boundaries were reviewed on 2026-08-17.
- Continue recurring checks for file uploads, rate limits, AI prompt-injection boundaries, secrets/dependencies and academic integrity.
- Supabase Auth leaked-password protection remains an operational setting to enable.

## 🔴 Assessment intelligence adapter
- Audit current Exam Hub, past-paper, syllabus and exam-result producers.
- Map existing marked-exam evidence into the canonical assessment evidence model.
- Preserve stable assessment/attempt identifiers.

## 🔴 Product observability completion
- Close gaps in activation, retention, error, latency, sync-failure and AI-cost telemetry.
- Verify admin/traction dashboards against real producers.

## 🟡 Curriculum coverage expansion
- Populate real topic catalogs for supported Cambridge/ZIMSEC subjects before adaptive scheduling depends on them.
- Never invent syllabus content.

## 🟡 Tertiary learning workflows
- The tertiary foundation and onboarding pathway now exist.
- Extend the existing `academic_contexts` root into richer courses/modules, assessments, workload/deadlines, credits/GPA and higher-ed exam workflows.
- Reuse `academic_contexts`, existing learning evidence and `topic_mastery`.

## 🟢 Long-horizon architecture
- Multi-device synchronization after single-device offline reliability.
- Optional P2P educational exchange only after the cloud sync trust model is mature.
- Digital twin, multi-agent Cortex and marketplace remain downstream of validated learning value.
