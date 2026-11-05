# Offline architecture (service worker v7)

Goal: a student who loses signal (load-shedding, data runs out, bad coverage) keeps working instead of hitting a crash screen.

## What the worker does (`public/sw.js`)

| Request | Behaviour |
| --- | --- |
| Page navigation | Network first. If the network fails, or takes over 6 s and a saved copy exists, serve the saved page. Pages are saved **by path** (`/dashboard?tab=2` and `/dashboard` are one page). |
| Never saved | Redirected responses (e.g. a login page returned for `/dashboard`), errors, non-HTML. |
| `/` while offline | The saved dashboard if there is one, otherwise `/offline.html`. |
| Hashed build files (`/_next/static/*`) | Saved copy first (they never change); the `?dpl=` query is ignored when matching. |
| Images (`/_next/image`, icons) | Network first, saved copy as fallback. |
| In-app navigation payloads (RSC) | Reused only on an exact URL match. No saved copy means a clean network error, which makes Next do a full page load, served from the saved page. |
| `/api/*`, non-GET, other origins, `Authorization` requests, `/sw.js` | Never touched. |

## Saving screens for offline (`WARM_ROUTES`)

Visiting a page online only saves it if it was opened as a *document*. In-app (client-side) navigation never does, so most screens used to be unavailable offline.

`OfflineWarmup` (mounted in the signed-in layout) asks the worker to save the core screens (`CORE_OFFLINE_ROUTES` in `src/lib/offline/warmPolicy.ts`) about 8 s after load. The **worker fetches the pages itself** and also saves every build file they reference. No page code runs, so nothing is tracked, generated or counted as a visit (loading pages in hidden iframes would do all of that, so it is deliberately not used).

Data-cost rules (students pay for data): skipped on data-saver and 2G, at most once per 12 h per learner per worker version, and retried sooner if most of it failed.

## Sign-out

`CLEAR_APP_CACHE` deletes saved pages and RSC payloads (they contain the learner's data). Build files hold no user data and stay.

## When something still fails offline

`RouteError` recognises offline failures (missing code file or failed fetch while `navigator.onLine` is false). It shows "You're offline", the screens saved on the device, and retries by itself when the connection returns. Real bugs keep the old screen and are reported to Sentry; offline noise is not. A missing code file while *online* means the app was updated mid-session and shows "Shadecode was updated" with a Reload button.

## Known limits (do not over-promise)

- Only the core screens are saved up front. Other screens open offline only if they were opened as a page while online.
- Code that a screen loads lazily after it opens may not be saved until it has been used once online.
- Saved pages are the server-rendered snapshot from the last online visit. Data created offline depends on each feature's local-first storage and sync (see `OFFLINE_SYNC_AUDIT.md`); this layer does not add a write queue.
- The worker is registered in production only.

## Testing

- `src/lib/offline/serviceWorker.test.ts` loads the real `sw.js` into a sandbox with an in-memory Cache API and simulates going online and offline. It was mutation-checked: breaking the redirect guard, path keying or sign-out clearing makes tests fail.
- Real-phone check (needed, not automatable here): open the installed app online and wait about 30 s on Wi-Fi; switch on airplane mode; force-close and reopen the app; open Dashboard, Learn, Practice exams, Past papers; build a paper for Maths and Physics; switch airplane mode off and confirm normal use resumes.
