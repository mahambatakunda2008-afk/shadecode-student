# Product Observability Audit

Date: 2026-08-16
Status: discovery/audit complete

## Live telemetry already present

The production database already contains four useful telemetry systems:

- `ai_usage_logs`: 11 rows
- `ai_usage_aggregates`: 0 rows
- `learning_events`: 0 rows
- `traction_events`: 23 rows

`ai_usage_logs` already records provider/model, token counts, estimated cost, latency, success/failure and error metadata.

`ai_usage_aggregates` already has the intended request, success-rate, token, cost, latency-percentile and unique-user fields, but it is currently empty.

`learning_events` already has the right basic shape for learning-outcome telemetry, but it is currently empty.

`traction_events` is the only currently populated general product-event stream in the audited tables.

## Existing product-health metric gaps

The product needs a small canonical metric vocabulary rather than many disconnected analytics events.

### Activation

- signup completed
- onboarding completed
- first study session
- first task completed
- first lesson completed
- first exam started
- first exam completed

### Retention

- active learner day
- active learner week
- return after 1/7/30 days
- study streak continuation

### Learning outcome

- lesson completion
- practice attempt
- exam score
- topic mastery change
- revision recommendation accepted

### Reliability

- API error
- AI provider failure
- AI timeout
- sync failure
- offline mutation queued
- sync success/conflict
- exam session recovery

### Cost

- AI request
- provider/model
- tokens
- latency
- estimated cost
- success/failure

## Important finding

The database has more telemetry infrastructure than actual instrumentation. The key observability problem is therefore **event production and canonicalization**, not creation of more tables.

Do not create another analytics/events table before auditing current producers.

## Privacy rules

- Do not put raw prompts, student answers, private lesson text or secrets into generic product events.
- Keep user identifiers protected and use aggregate reporting wherever individual identity is unnecessary.
- AI usage metadata should be separated from learning-content telemetry.
- Error metadata must be scrubbed for tokens, credentials and sensitive student content.

## Implementation order

1. Inventory existing event producers.
2. Define canonical event names and required properties.
3. Wire activation and retention events first.
4. Wire learning-outcome events.
5. Verify AI usage logging coverage and aggregation jobs.
6. Add reliability events for offline sync and exam recovery.
7. Build dashboards only after event production is verified.

## Acceptance criteria

Observability is considered production-ready when:

- a new user can be followed through activation without relying on raw database guesses;
- retention can be computed consistently;
- learning outcomes can be measured without exposing private content;
- AI success, latency and cost can be attributed by feature/provider/model;
- failures can be distinguished from normal user behavior;
- offline/sync failures are visible;
- event definitions are documented and stable.

## Conclusion

Shadecode already has the database foundations for product intelligence. The next work is to connect the right producers, validate event quality and generate aggregates before building an elaborate analytics dashboard.