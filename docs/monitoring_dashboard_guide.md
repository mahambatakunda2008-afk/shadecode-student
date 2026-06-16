# Monitoring Dashboard Guide

This guide details how to navigate the Sentry and Vercel dashboards to search, debug, and trace failures across Shadecode Student's core systems.

---

## 1. Querying Sentry Telemetry

Every exception reported by our structured logging system contains standardized tags and context. You can use these tags to filter search results instantly in the Sentry issue stream.

### Key Search Queries

Filter by subsystem domain:
* **Cortex Failures**: `domain:Cortex`
* **Lesson Generation Outages**: `domain:LessonGen`
* **Offline Sync Failures**: `domain:OfflineSync`
* **API Failures**: `domain:API`
* **Exam Simulation Failures**: `domain:ExamSim`
* **Revision Queue Failures**: `domain:RevisionQueue`

Filter by specific events:
* `event:cortex_failure` (AI model timeouts, approval errors, bad schemas)
* `event:lesson_generation_failed` (exhausted AI keys, parsing failures)
* `event:offline_sync_failed` (IndexedDB locks, failed sync requests to Supabase)
* `event:api_failure` (HTTP 500 status codes, network drops)
* `event:exam_marking_failed` (AI grading errors)

### Tracing a Specific Failure

When you click on an issue in Sentry:
1. **Tags Panel**: Inspect `domain` and `event` tags. Check user details (e.g., `userId` tag if populated).
2. **Additional Data (Extra)**: Inspect the structured payload.
   * For **LessonGen** issues, look for `subject`, `topic`, `difficulty`, and the raw `AI response excerpt` if a parsing error occurred.
   * For **OfflineSync** issues, look for `operation`, `table` and the detailed sync error stack.
   * For **Cortex** issues, look for `stage` and the input `payload` that caused the AI engine to fail.
3. **Session Replay**: Sentry automatically captures a visual screen recording leading up to any client-side crash (`replaysOnErrorSampleRate: 1.0`). If a crash occurs, click the **Replay** tab on the issue page to watch the user's exact clicks and scroll behaviors before the crash.

---

## 2. Vercel Web Analytics Dashboard

Use the Vercel Web Analytics tab to monitor overall application health:
1. **Audience Vitals**: Check active visitors, countries, and device types to ensure compatibility.
2. **Page Performance**: View page path metrics to find the most visited pages (e.g. `/dashboard`, `/learn`) and identify if any route shows high bounce rates (often caused by rendering failures).
3. **Event Tracking**: Configure custom click track metrics within the Vercel dashboard to observe feature adoption.

---

## 3. Vercel Speed Insights Dashboard

Vercel Speed Insights shows real-world loading speed, interactivity, and visual stability:
1. **Core Web Vitals**:
   * **LCP (Largest Contentful Paint)**: Shows when the main lesson or exam content renders. Ensure it stays under 2.5s.
   * **CLS (Cumulative Layout Shift)**: Tracks UI shifts during rendering (e.g., math formulas or markdown rendering). Target: < 0.1.
   * **INP (Interaction to Next Paint)**: Measures UI responsiveness. Target: < 200ms.
2. **URL Route Breakdown**: Identify which routes are slow. If `/learn` or `/exam-sim` show poor scores, consider adding further route-level caching or using React Suspense boundaries.
