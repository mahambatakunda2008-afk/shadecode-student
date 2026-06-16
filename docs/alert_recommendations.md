# Production Alert Recommendations

To ensure every production failure is traceable and acted upon before impacting students, we recommend setting up the following alert rules within your Sentry dashboard under **Alerts > Create Alert Rule**.

---

## 1. High Priority Alerts (PagerDuty / SMS / Discord / Slack)

These alerts represent critical system outages that block core learning functionality. Action must be taken immediately.

### Alert Rule A: Root Layout Crash (App-wide outage)
* **Trigger Condition**: An event occurs with tag `boundary:global-error-boundary`.
* **Action Threshold**: `Count > 0` (Alert on first occurrence).
* **Rationale**: The root React layout crashed, rendering the app completely blank and unresponsive. Users are locked out until reload.

### Alert Rule B: Cortex AI Gateway Failure
* **Trigger Condition**: An event occurs with tags `domain:Cortex` and `event:cortex_failure`.
* **Action Threshold**: `Count >= 5` in `10 minutes`.
* **Rationale**: The AI analysis runtime is offline or returning bad schema outputs. This indicates potential LLM provider outages or broken API routing.

### Alert Rule C: Lesson & Course Generation Block
* **Trigger Condition**: An event occurs with tags `domain:LessonGen` and `event:lesson_generation_failed`.
* **Action Threshold**: `Count >= 5` in `30 minutes`.
* **Rationale**: Students cannot generate new custom curriculum material. Usually indicates exhausted AI API balances or Gemini/Cloudflare API key rotation issues.

---

## 2. Medium Priority Alerts (Slack / Email)

These alerts represent performance degradation or non-blocking system failures that should be fixed in the next development sprint.

### Alert Rule D: API Endpoint Failure (HTTP 500)
* **Trigger Condition**: An event occurs with tags `domain:API` and `event:api_failure`.
* **Action Threshold**: `Count >= 10` in `1 hour`.
* **Rationale**: Internal database queries or Supabase auth clients are throwing exceptions.

### Alert Rule E: Offline Sync Failures
* **Trigger Condition**: An event occurs with tags `domain:OfflineSync` and `event:offline_sync_failed`.
* **Action Threshold**: `Count >= 15` in `1 hour`.
* **Rationale**: Offline progress updates are failing to sync back to the database. If persistent, this leads to client-side data loss. Usually caused by Supabase schema conflicts or network transport issues.

---

## 3. Recommended Sentry Alert Setup Workflow

1. In Sentry, navigate to **Alerts** and select **Create Alert**.
2. Select **Issues** (for alert A, B, C) and **Metric Alert** (for D, E).
3. Set the filters using the exact search parameters defined in this document (e.g. `domain:Cortex event:cortex_failure`).
4. Configure actions to post to your team's communications hub (e.g., Slack Webhook or Email list).
5. Add a link to the [Monitoring Dashboard Guide](./monitoring_dashboard_guide.md) in the alert description to assist the responding engineer.
