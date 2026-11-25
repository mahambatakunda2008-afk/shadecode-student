# Offline architecture (service worker v10)

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

`OfflineWarmup` (mounted in the signed-in layout) derives its route list from the same stage- and subject-aware navigation used by the learner's sidebar and mobile More menu. Dashboard and Settings are always included; admin, teacher-only and API destinations are excluded. Eligible Comp Lab and Biology Practical routes are included only when the learner's subjects unlock them. About 8 s after load, the **worker fetches the pages itself** and saves every build file they reference. No page code runs, so nothing is tracked, generated or counted as a visit.

Data-cost rules (students pay for data): skipped on data-saver and 2G, at most once per 12 h per learner per worker version, and retried sooner if most of it failed.

## Sign-out

`CLEAR_APP_CACHE` deletes saved pages and RSC payloads (they contain the learner's data). Build files hold no user data and stay.

## When something still fails offline

`RouteError` recognises offline failures (missing code file or failed fetch while `navigator.onLine` is false). It shows "You're offline", the screens saved on the device, and retries by itself when the connection returns. Real bugs keep the old screen and are reported to Sentry; offline noise is not. A missing code file while *online* means the app was updated mid-session and shows "Shadecode was updated" with a Reload button.

## Known limits (do not over-promise)

- Only destinations exposed by the learner's resolved navigation are warmed up front (up to the worker's 30-route safety cap). Feature data, API-backed content and lazy assets not referenced by the saved screens may still need their own download/local-first support.
- Code that a screen loads lazily after it opens may not be saved until it has been used once online.
- Saved pages are the server-rendered snapshot from the last online visit. Data created offline depends on each feature's local-first storage and sync (see `OFFLINE_SYNC_AUDIT.md`); this layer does not add a write queue.
- The worker is registered in production only.

## Testing

- `src/lib/offline/serviceWorker.test.ts` loads the real `sw.js` into a sandbox with an in-memory Cache API and simulates going online and offline. It was mutation-checked: breaking the redirect guard, path keying or sign-out clearing makes tests fail.
- Real-device check (needed, not automatable here): install/update the PWA and Android app online; wait for warm-up; switch on airplane mode; force-close and cold-start; traverse every visible navigation destination; exercise notes, answers, tasks, timetable, focus, Comp Lab and practical tools; force-close/reopen; switch accounts; restore connectivity and verify idempotent sync.


## Comp Lab runtime availability

- JavaScript and the Shade interpreter run locally.
- TypeScript uses a lazy same-origin Next.js chunk and is available offline after its first successful online load.
- SQL uses the pinned `sql.js` package's browser distribution, copied with its WASM binary into `public/runtimes/` during dev/build preparation. The runtime JavaScript is loaded as a same-origin script to avoid bundling its Node-only `fs` branch into the browser graph. The service worker caches same-origin JavaScript and WASM assets after first successful fetch, so SQL is available offline after its first successful online execution.
- Python/Pyodide still uses a remote runtime distribution and remains online-dependent. It needs a separate learner-controlled runtime pack because its assets are substantially larger.
- First-ever execution of TypeScript or SQL while already offline is not guaranteed unless the runtime was loaded online beforehand.
