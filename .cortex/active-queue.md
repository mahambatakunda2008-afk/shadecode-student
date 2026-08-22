# Cortex Active Execution Queue

This is the executable queue for Cortex Engineering. `.cortex/tasks.md` remains the historical/strategic roadmap and audit trail.

## 🔴 Security audit completion
- Finish auth/API/file-upload/service-role/AI-boundary review.
- Reconcile live Supabase security findings with repository migrations.
- Add regression coverage for authorization boundaries.

## 🔴 Assessment intelligence adapter
- Audit current Exam Hub, past-paper, syllabus and exam-result producers.
- Map existing marked-exam evidence into the canonical assessment evidence model.
- Preserve stable assessment/attempt identifiers.

## 🔴 Offline sync completion
- [~] Offline navigation integration: service-worker RSC caching, network-only public landing page, authenticated `/` → `/dashboard`, and offline-safe `(app)` auth gate are now shipped.
- Add server-side idempotency handling for queued mutations.
- Define operation-specific conflict policies.
- Add retry/backoff and permanent-failure visibility.
- Verify account switching and logout/login behavior in a real browser.

## 🔴 Product observability completion
- Close gaps in activation, retention, error, latency, sync-failure and AI-cost telemetry.
- Verify admin/traction dashboards against real producers.

## 🟡 Curriculum coverage expansion
- Populate real topic catalogs for supported Cambridge/ZIMSEC subjects before adaptive scheduling depends on them.
- Never invent syllabus content.

## 🟡 Tertiary learning workflows
- Extend the existing tertiary foundation into courses/modules, assessments, workload/deadlines, credits/GPA and higher-ed exam workflows.
- Reuse `academic_contexts`, existing learning evidence and `topic_mastery`.
